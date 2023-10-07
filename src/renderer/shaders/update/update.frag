#version 300 es
precision mediump float;

uniform sampler2D positionTexRead;
uniform sampler2D velocityTexRead;
uniform ivec2 texDimensions;
uniform float deltaTime;
uniform int nrParticle;

uniform sampler2D sortedHashedIdTex;
uniform sampler2D hash2indicesBeginTex;
uniform sampler2D hash2indicesEndTex;
uniform int hashDimension;

uniform float sep_radius;
uniform float coh_radius;
uniform float ali_radius;
uniform float sep_k;
uniform float coh_k;
uniform float ali_k;
uniform float maxForce;
uniform float maxSpeed;
uniform float minSpeed;
uniform float restrictRadius;
uniform float restrictStrength;

uniform float gridSize;
uniform int hashSize;

layout(location=0) out vec4 positionColor;
layout(location=1) out vec4 VelocityColor;

#define P1 842167
#define P2 881477
#define P3 742219

#define PI 3.1415926

ivec3 grid2positiveGrid(ivec3 grid){
    grid.x = grid.x<0 ? -grid.x*2 : grid.x*2+1;
    grid.y = grid.y<0 ? -grid.y*2 : grid.y*2+1;
    grid.z = grid.z<0 ? -grid.z*2 : grid.z*2+1;
    return grid;
}

ivec3 pos2grid(vec3 v){
    return ivec3(floor(v / gridSize));
}

ivec3 pos2positiveGrid(vec3 v){
    return grid2positiveGrid(pos2grid(v));
}

int grid2hash(ivec3 grid){
    return ((grid.x*P1) ^ (grid.y*P2) ^ (grid.z*P3)) % hashSize;
}

int pos2hash(vec3 pos){
    return grid2hash(pos2grid(pos));
}

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

vec3 culcForce(vec3 position, vec3 velocity){
    
    vec3 sep_velSum = vec3(0.0);
    vec3 coh_posSum = vec3(0.0);
    int coh_cnt = 0;
    vec3 ali_velSum = vec3(0.0);
    int ali_cnt = 0;

    const float blindAngle = 90.0 * PI / 180.0;
    float lookUpAngle = PI - blindAngle*0.5;

    vec3 nv = normalize(velocity);

    vec3 force = vec3(0.0);

    ivec3 grid = pos2grid(position);
    for(int dx=-1; dx<2; dx++){ for(int dy=-1; dy<2; dy++){ for(int dz=-1; dz<2; dz++){
        ivec3 neighborGrid = grid2positiveGrid(grid + ivec3(dx, dy, dz));
        int neighborHash = grid2hash(neighborGrid);

        ivec2 indexRangeBegin = ivec2(
            sampleAs1D(hash2indicesBeginTex, ivec2(hashDimension, hashDimension), neighborHash).xy
        );
        ivec2 indexRangeEnd = ivec2(
            sampleAs1D(hash2indicesEndTex, ivec2(hashDimension, hashDimension), neighborHash).xy
        );

        ivec2 indexRange;
        if(indexRangeBegin.y != 0){
            indexRange = indexRangeBegin;
        } else {
            indexRange = ivec2(indexRangeBegin.x, indexRangeEnd.y);
        }

        for(int i=indexRange.x; i<indexRange.y; i++){
            int other_id = int(sampleAs1D(sortedHashedIdTex, texDimensions, i).x);
            vec3 posOther = sampleAs1D(positionTexRead, texDimensions, other_id).xyz;
            vec3 velOther = sampleAs1D(velocityTexRead, texDimensions, other_id).xyz;

            vec3 r = position - posOther;
            float dist2 = dot(r,r);

            vec3 nr = normalize(r);

            if(r.x == 0.0) break;

            if(dist2 < sep_radius*sep_radius){
                sep_velSum += nr / sqrt(dist2);
            }
            if(dist2 < coh_radius*coh_radius && dot(nv, -nr) > cos(lookUpAngle)){
                coh_posSum += posOther;
                coh_cnt++;
            }
            if(dist2 < ali_radius*ali_radius && dot(nv, -nr) > cos(lookUpAngle)){
                ali_velSum += velOther;
                ali_cnt++;
            }

        }

    }}}
    
    if(sep_velSum != vec3(0.0)){
        vec3 desiredVel = limit(sep_velSum, maxSpeed);
        force += limit(desiredVel - velocity, maxForce) * sep_k;
    }

    if(coh_cnt != 0){
        vec3 desiredVel = limit(coh_posSum/float(coh_cnt) - position, maxSpeed);
        force += limit(desiredVel - velocity, maxForce) * coh_k;
    }

    if(ali_cnt != 0){
        vec3 desiredVel = ali_velSum / float(ali_cnt);
        force += limit(desiredVel - velocity, maxForce) * ali_k;
    }

    return limit(force, maxForce);

}

vec3 constrainArea(vec3 pos, vec3 vel){
    // to center
    const float maxForce = 3.0;
    if(dot(pos,pos) > restrictRadius*restrictRadius){
        return limit(-pos - vel, maxForce*restrictStrength);
    }
    return vec3(0.0);
}

void main(){
    vec3 position = texelFetch(positionTexRead, ivec2(gl_FragCoord.xy), 0).xyz;
    vec3 velocity = texelFetch(velocityTexRead, ivec2(gl_FragCoord.xy), 0).xyz;

    vec3 force = culcForce(position, velocity);
    force += constrainArea(position, velocity);

    velocity += force * deltaTime;
    if(length(velocity) < minSpeed) velocity = normalize(velocity) * minSpeed;
    position += velocity * deltaTime;

    positionColor = vec4(position, 1.0);
    VelocityColor = vec4(velocity, 1.0);
}