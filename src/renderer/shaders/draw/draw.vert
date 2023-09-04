#version 300 es
precision mediump float;

layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aTex;

uniform sampler2D positionTex;
uniform vec2 dim;

uniform mat4 model;
uniform mat4 view;
uniform mat4 proj;

out vec3 iNormal;
out vec2 iTex;

vec4 getValueFromTexture(sampler2D tex, vec2 dim, float id){
    float x = mod(id, dim.x);
    float y = floor(id / dim.x);
    vec2 texCoord = (vec2(x,y) + 0.5) / dim;
    return texture(tex, texCoord);
}

void main() {
    vec4 worldPos = getValueFromTexture(positionTex, dim, float(gl_InstanceID));
    vec4 pos = model * vec4(aPos, 1.0);

    pos.xyz += worldPos.xyz;
    
    gl_Position = proj * view * pos;
    iNormal = aNormal;
    iTex = aTex;
}