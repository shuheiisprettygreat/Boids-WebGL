#version 300 es
precision mediump float;

uniform sampler2D positionTexRead;
uniform sampler2D velocityTexRead;
uniform vec2 texDimentions;
uniform float deltaTime;
uniform float nrParticle;

layout(location=0) out vec4 positionColor;
layout(location=1) out vec4 VelocityColor;

// n-body
vec3 culcForce(vec3 position, vec3 velocity){
    vec3 force = vec3(0.0);

    for(float i=0.0; i<float(nrParticle); i++){
        vec2 texCoord = vec2(mod(i, texDimentions.x), floor(i / texDimentions.x));
        vec3 posOther = texture(positionTexRead, texCoord).xyz;
        vec3 r = posOther - position;
        float distSq = dot(r, r) + 0.1;
        float dist = sqrt(distSq);
        float invDistCube = 1.0 / (dist * dist * dist);

        force += invDistCube * r;

    }

    return force;
}

void main(){

    vec2 texCoord =  gl_FragCoord.xy / texDimentions;

    vec3 position = texture(positionTexRead, texCoord).xyz;
    vec3 velocity = texture(velocityTexRead, texCoord).xyz;

    vec3 force = culcForce(position, velocity);

    float forceCap = 10.0;
    if(dot(force, force) > forceCap * forceCap){
        force = normalize(force) * forceCap;
    }

    force += -position * 0.01;

    velocity += force * deltaTime;
    position += velocity * deltaTime;

    positionColor = vec4(position.xyz, 1.0);
    VelocityColor = vec4(velocity, 1.0);
}