#version 300 es
precision mediump float;

out vec3 positions;

vec4 getValueFromTexture(sampler2D tex, vec2 dim, float id){
    float x = mod(id, dim.x);
    float y = floor(id / dim.x);
    vec2 texCoord = (vec2(x,y) + 0.5) / dim;
    return texture(tex, texCoord);
}

void main() {

}