#version 300 es
precision mediump float;
 
uniform sampler2D positionTexRead;
uniform vec2 texDimensions;

out vec3 position;

// vec4 getValueFromTexture(sampler2D tex, vec2 dim, float id){
//     float x = mod(id, dim.x);
//     float y = floor(id / dim.x);
//     vec2 texCoord = (vec2(x,y) + 0.5) / dim;
//     return texture(tex, texCoord);
// }

void main() {
    // vec3 pos = getValueFromTexture(positionTexRead, texDimensions, float(gl_VertexID)).xyz;
    // position = vec3(10.0, 0, 0);
    position = vec3(float(gl_VertexID)*0.5, 0, 0);
}