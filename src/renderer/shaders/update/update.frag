#version 300 es
precision mediump float;

uniform sampler2D positionTexRead;
uniform sampler2D velocityTexRead;
uniform sampler2D sortedHashedIdTex;
uniform sampler2D hash2indicesTex;
uniform sampler2D range1Tex;
uniform sampler2D range2Tex;
uniform sampler2D maxRangeTex;

uniform ivec2 texDimensions;
uniform float time;
uniform float deltaTime;
uniform int nrParticle;

uniform float v0;
uniform float tau;
uniform float M;
uniform float weightRandomForce;
uniform float Rmax;
uniform float du;
uniform float s;
uniform float nc;
uniform float rh;
uniform float gammaSq;
uniform float ws;
uniform float wa;
uniform float wc;
uniform vec2 roostXZ;
uniform float roostHeight;
uniform float wRoostH;
uniform float wRoostV;
uniform float L0;
uniform float T0;
uniform float invLDRatio;
uniform float wRollIn;
uniform float wRollOut;

// #define L0 0.78
// #define T0 0.24
// #define invLDRatio 0.3030

uniform int hashDimension;

uniform float gridSize;
uniform int hashSize;

layout(location=0) out vec4 positionColor;
layout(location=1) out vec4 VelocityColor;
layout(location=2) out vec4 rangeColor1;
layout(location=3) out vec4 rangeColor2;

#define TAU 6.28318531

#define BLINDANGLE (TAU*0.25)
#define COSBLINDANGLE cos(TAU*0.5 - BLINDANGLE*0.5)

// === ======= ===
// === 3d hash ===
// === ======= ===
#define P1 842167
#define P2 881477
#define P3 742219

float getGridSize(){
    vec4 c = texelFetch(maxRangeTex, ivec2(0,0), 0);
    return min(Rmax, max(max(c.x, c.y), max(c.z, c.w)));
}

ivec3 grid2positiveGrid(ivec3 grid){
    grid.x = grid.x<0 ? -grid.x*2 : grid.x*2+1;
    grid.y = grid.y<0 ? -grid.y*2 : grid.y*2+1;
    grid.z = grid.z<0 ? -grid.z*2 : grid.z*2+1;
    return grid;
}

ivec3 pos2grid(vec3 v){
    return ivec3(floor(v / getGridSize()));
}

int grid2hash(ivec3 grid){
    return ((grid.x*P1) ^ (grid.y*P2) ^ (grid.z*P3)) % hashSize;
}

// === ==== ===
// === hash ===
// === ==== ===

float hash1(uint n){
    // integer hash copied from Hugo Elias
	n = (n << 13U) ^ n;
    n = n * (n * n * 15731U + 789221U) + 1376312589U;
    return float( n & uint(0x7fffffffU))/float(0x7fffffff);
}

// iq hash 2 - uintx3 => float01x3
#define HASHPARAM 1103515245U
vec3 hash(uvec3 x){
    x = ((x>>8U)^x.yzx)*HASHPARAM;
    x = ((x>>8U)^x.yzx)*HASHPARAM;
    x = ((x>>8U)^x.yzx)*HASHPARAM;
    
    return vec3(x)*(1.0/float(0xffffffffU));
}

// === ==== ===
// === main ===
// === ==== ===

vec4 sampleAs1D(sampler2D tex, ivec2 dim, int i){
    ivec2 texCoord = ivec2(i%dim.x, i/dim.x);
    return texelFetch(tex, texCoord, 0);
}

vec3 limit(vec3 v, float cap){
    if(length(v) > cap){
        return normalize(v)*cap;
    }
    return v;
}

vec3 randomInsideSphere(uvec3 seed){
    vec3 rand = hash(seed);
    float r = pow(rand.x, 0.3333);
    float t = TAU * rand.y;
    float p = acos(2.0*rand.z - 1.0);
    float sp = sin(p);
    return vec3(r*sp*cos(t), r*sp*sin(t), r*cos(p));
}

vec3 computeCruiseForce(vec3 velocity){
    float l = length(velocity);
    vec3 tangent = velocity / l;

    vec3 result = tangent * (M*(v0-l)/tau);
    return result;
}

vec3 computeRandomForce(vec3 p){
    vec3 randSphere = randomInsideSphere(floatBitsToUint(p));
    return randSphere * weightRandomForce; 
}

float getSeparationGaussian(vec3 d){
    float l = min(0.0, length(d) - rh);
    return exp(-l*l/gammaSq);
}

vec3 rotateAroundAxis(vec3 axis, vec3 v, float angle){
    float ca = cos(angle);
    return ca*v + (1.0-ca)*dot(v,axis)*axis + sin(angle)*cross(axis, v);
}

void main(){
    ivec2 ifrag = ivec2(gl_FragCoord.xy);
    int thisId = ifrag.x + ifrag.y*texDimensions.x;

    vec4 positionAndBanking = texelFetch(positionTexRead, ifrag, 0);
    vec3 velocity = texelFetch(velocityTexRead, ifrag, 0).xyz;
    vec4 range1 = texelFetch(range1Tex, ifrag, 0);
    vec4 range2 = texelFetch(range2Tex, ifrag, 0);

    vec3 position = positionAndBanking.xyz;
    float bankingAngle = positionAndBanking.w;
    vec3 tangent = normalize(velocity);
    vec3 bitangent = normalize(cross(tangent, vec3(0, 1, 0)));
    bitangent = rotateAroundAxis(tangent, bitangent, bankingAngle);
    vec3 normal = cross(bitangent, tangent);
     
    // topological interaction
    // NOTE : range2.x is range updated on 5 frame before.
    float neighborRange = range2.y; 
    int neighborCount = 0;
    int neighborVisibleCount = 0;
    int centralityNeighborCount = 0;

    vec3 separationVectorSum = vec3(0.0);
    vec3 cohesionVectorSum = vec3(0.0);
    vec3 centralityVectorSum = vec3(0.0);
    vec3 alignmentVectorSum = vec3(0.0);

    // Compute neighborhood.
    ivec3 grid = pos2grid(position);
    for(int dx=-1; dx<2; dx++){ for(int dy=-1; dy<2; dy++){ for(int dz=-1; dz<2; dz++){
        ivec3 neighborGrid = grid2positiveGrid(grid + ivec3(dx, dy, dz));
        int neighborHash = grid2hash(neighborGrid);

        vec4 indexRange = sampleAs1D(hash2indicesTex, ivec2(hashDimension, hashDimension), neighborHash);
        int indexBegin = int(packHalf2x16(indexRange.xy));
        int indexEnd= int(packHalf2x16(indexRange.zw));

        for(int i=indexBegin; i<indexEnd; i++){
            int otherId = int(sampleAs1D(sortedHashedIdTex, texDimensions, i).x);
            if(thisId == otherId) continue;
            vec3 posOther = sampleAs1D(positionTexRead, texDimensions, otherId).xyz;
            vec3 velOther = sampleAs1D(velocityTexRead, texDimensions, otherId).xyz;
            
            vec3 d = posOther - position; 
            float dMag = length(d);
            vec3 nd = d / dMag;
            
            // this indivisual is inside perception range!
            float insideRange = 1.0 - step(neighborRange, dMag);
            neighborCount += int(insideRange);

            // this indivisual is inside visible perception range!
            float visibleInsideRange = insideRange * step(dMag*COSBLINDANGLE, dot(tangent, d));
            neighborVisibleCount += int(visibleInsideRange);

            separationVectorSum += insideRange * nd * getSeparationGaussian(d);
            cohesionVectorSum += visibleInsideRange * nd * step(rh,dMag);

            float centralityCheck = 1.0 - step(2.0*neighborRange, dMag);
            centralityNeighborCount += int(centralityCheck);
            centralityVectorSum += nd*centralityCheck;

            alignmentVectorSum += visibleInsideRange * (normalize(velOther) - tangent);
        }
    }}}

    // compute social forces
    vec3 separationForce = neighborCount== 0 ? vec3(0.0) : -ws/float(neighborCount)*separationVectorSum;

    float centralityFactor = centralityNeighborCount==0 ? 0.0 : length(centralityVectorSum) / float(centralityNeighborCount);
    vec3 cohesionForce =  neighborVisibleCount==0 ? vec3(0.0) : wc*centralityFactor/float(neighborVisibleCount)*cohesionVectorSum;

    vec3 alignmentForce = neighborVisibleCount==0 ? vec3(0.0) : wa*normalize(alignmentVectorSum);

    vec3 socialForce = separationForce + cohesionForce + alignmentForce;

    // roost attraction
    // float l = length(position - vec3(roostXZ.x, roostHeight, roostXZ.y));
    vec3 n = normalize(position - vec3(roostXZ.x, position.y, roostXZ.y));
    float multiplier = mix(-1.0, 1.0, step(0.0, n.x*tangent.z - n.z*tangent.x));
    // vec3 roostForceH = (wRoostH + l*0.0003)* (0.5 + 0.5*dot(n, tangent)) * bitangent * multiplier;
    vec3 roostForceH = wRoostH * (0.5 + 0.5*dot(n, tangent)) * bitangent * multiplier;
    vec3 roostForceV = wRoostV * (roostHeight - position.y) * vec3(0.0, 1.0, 0.0);

    // roostForceV *= position.y < roostHeight ? 1.0 : (position.y> roostHeight*1.5) ? 1.0 : 0.0;

    vec3 steeringForce = socialForce + roostForceH + roostForceV;
    steeringForce += computeCruiseForce(velocity);
    steeringForce += computeRandomForce(position);
    // steeringForce = -bitangent*0.2;

    // physics of flight
    float v2 = dot(velocity, velocity) / (v0*v0);
    float lift = v2*L0;
    float drag = invLDRatio * v2 * L0;
    vec3 flightForce = lift*normal - drag*tangent + T0*tangent + vec3(0.0, -L0, 0.0);

    vec3 force = steeringForce + flightForce;
    // force += -position * 0.1 * step(200.0, length(position));

    // Update Banking angle
    float lateralAcceleration = dot(steeringForce, bitangent);
    float tanRollIn = wRollIn * lateralAcceleration * deltaTime;
    float tanRollOut = wRollOut * sin(bankingAngle) * deltaTime;
    float rollIn = atan(tanRollIn);
    float rollOut = atan(tanRollOut);
    float newBankingAngle = bankingAngle + rollIn - rollOut;
    float u = 0.75;
    newBankingAngle = (1.0-u) * bankingAngle + u * newBankingAngle;
    newBankingAngle = clamp(newBankingAngle, -TAU*0.25, TAU*0.25);

    // Update Neighbor Range
    float newNeighborRange = (1.0-s)*neighborRange + s*Rmax*(1.0 - float(neighborCount)/nc);
    newNeighborRange = clamp(newNeighborRange, 0.0, Rmax);
    range2 = vec4(range1.w, range2.xyz);
    range1 = vec4(newNeighborRange, range1.xyz);


    // Check if hash-to-indices works ok
    // int neighborCountActual = 0;
    // for(int i=0; i<nrParticle; i++){
    //     int otherId = int(sampleAs1D(sortedHashedIdTex, texDimensions, i).x);
    //     if(thisId == otherId) continue;

    //     vec3 posOther = sampleAs1D(positionTexRead, texDimensions, otherId).xyz;
    //     float dMag = length(posOther - position);

    //     // this indivisual is inside perception range!
    //     float insideRange = 1.0 - step(neighborRange, dMag);
    //     neighborCountActual += int(insideRange);
    // }

    // debug can be done with range texture's latter entries.
    // range2.w = float(neighborCount != neighborCountActual);

    velocity += force/M * deltaTime;
    position += velocity * deltaTime;

    positionColor = vec4(position, newBankingAngle);
    VelocityColor = vec4(velocity, 1.0);
    rangeColor1 = range1;
    rangeColor2 = range2;
}