#version 300 es
precision mediump float;

in vec3 iNormal;
in vec2 iTex;
in float ivid;

uniform sampler2D tex;

out vec4 FragColor;

void main() {
    FragColor = texture(tex, iTex)*vec4(0.6,0.6,0.6,1.0);
}