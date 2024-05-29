#version 300 es
precision mediump float;

uniform float height;

layout(location=0) out vec4 positionColor;
layout(location=1) out vec4 VelocityColor;
layout(location=2) out vec4 rangeColor1;
layout(location=3) out vec4 rangeColor2;

#define TAU 6.2831853

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

vec3 randomInsideCylinder(float radius, float height){
    vec3 rand = hash(uvec3(gl_FragCoord.xy, 10));
    float r = sqrt(rand.x) * radius;
    float angle = TAU * rand.y;
    vec3 result = vec3(r * cos(angle), height*rand.z ,r*sin(angle));
    return result;
}

vec3 randomInsideSphere(){
    vec3 rand = hash(uvec3(gl_FragCoord.xy, 20));
    float r = pow(rand.x, 0.3333);
    float t = TAU * rand.y;
    // float t = TAU * (rand.y * 0.4 + 0.3);

    float p = acos(2.0*rand.z - 1.0);
    p = p/(TAU*0.5) * 0.4 + 0.3;
    p *= TAU*0.5;

    float sp = sin(p);
    return vec3(r*sp*cos(t), r*cos(p), r*sp*sin(t));
}

void main(){
    vec3 position = randomInsideCylinder(150.0, 0.0) + vec3(0.0, height, 0.0);
    vec3 heading = randomInsideSphere();
    vec3 velocity = heading * 10.0;
    float bankingAngle = 0.0;

    positionColor = vec4(position, bankingAngle);
    VelocityColor = vec4(velocity, 1.0);
    
    float initialRange = 100.0;
    rangeColor1 = vec4(initialRange);
    rangeColor2 = vec4(initialRange);
}