#version 300 es
precision mediump float;

in vec3 iNormal;
in vec2 iTex;

out vec4 FragColor;

void main() {
    float diff = dot(iNormal, normalize(vec3(2,1,1)));
    diff = clamp(diff, 0.0, 1.0);
    diff = diff*0.5 + 0.5;
    diff = diff*diff;
    vec3 col = vec3(0.8, 0.4, 0.4);
    FragColor = vec4(col*diff, 1.0);
}