#version 300 es
precision mediump float;

uniform sampler2D positionTexRead;
uniform sampler2D velocityTexRead;
uniform vec2 texDimentions;
uniform float deltaTime;
uniform float nrParticle;

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

layout(location=0) out vec4 positionColor;
layout(location=1) out vec4 VelocityColor;

// n-body
// vec3 culcForce(vec3 position, vec3 velocity){
//     vec3 force = vec3(0.0);

//     for(float i=0.0; i<float(nrParticle); i++){
//         vec2 texCoord = vec2(mod(i, texDimentions.x), floor(i / texDimentions.x));
//         vec3 posOther = texture(positionTexRead, texCoord).xyz;
//         vec3 r = posOther - position;

//         if(r.x == 0.0) break;

//         float distSq = dot(r, r) + 0.1;
//         float dist = sqrt(distSq);
//         float invDistCube = 1.0 / (dist * dist * dist);

//         force += invDistCube * r;
//     }
//     return force;
// }

vec3 limit(vec3 v, float cap){
    if(length(v) > cap){
        return normalize(v)*cap;
    }
    return v;
}

#define PI 3.1415926

vec3 culcForce(vec3 position, vec3 velocity){

    vec3 sep_velSum = vec3(0.0);
    vec3 coh_posSum = vec3(0.0);
    int coh_cnt = 0;
    vec3 ali_velSum = vec3(0.0);
    int ali_cnt = 0;


    const float blindAngle = 90.0 * PI / 180.0;
    float lookUpAngle = PI - blindAngle*0.5;

    vec3 force = vec3(0.0);

    for(float i=0.0; i<float(nrParticle); i++){
        vec2 texCoord = vec2(mod(i, texDimentions.x), floor(i / texDimentions.x));
        texCoord /= texDimentions;
        vec3 posOther = texture(positionTexRead, texCoord).xyz;
        vec3 velOther = texture(velocityTexRead, texCoord).xyz;
        vec3 r = position - posOther;
        float dist2 = dot(r,r);

        vec3 nv = normalize(velocity);
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

    vec2 texCoord =  gl_FragCoord.xy / texDimentions;

    vec3 position = texture(positionTexRead, texCoord).xyz;
    vec3 velocity = texture(velocityTexRead, texCoord).xyz;

    vec3 force = culcForce(position, velocity);
    force += constrainArea(position, velocity);

    velocity += force * deltaTime;
    if(length(velocity) < minSpeed) velocity = normalize(velocity) * minSpeed;
    position += velocity * deltaTime;

    positionColor = vec4(position.xyz, 1.0);
    VelocityColor = vec4(velocity, 1.0);
}