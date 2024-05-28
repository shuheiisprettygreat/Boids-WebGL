#version 300 es
precision mediump float;

uniform sampler2D gradationTex;

in vec3 iTex;

out vec4 FragColor;

#define LOW 0.4
#define HIGH 0.9

void main() {

    float t = normalize(iTex).y * 0.5 + 0.5;
    // vec4 col = mix(col1, col2, t);
    t = (t-LOW) / (HIGH-LOW);
    t = clamp(t,0.01,0.99);

    vec4 col = texture(gradationTex, vec2(t, 0.5));
    FragColor = vec4(col.xyz, 1.0);
}