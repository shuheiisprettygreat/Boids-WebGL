#version 300 es
precision mediump float;

in vec3 iTex;

out vec4 FragColor;

void main() {
    vec4 col1 = vec4(0.1, 0.1, 0.1, 1.0);
    vec4 col2 = vec4(0.4, 0.4, 0.4, 1.0);

    float t = normalize(iTex).y * 0.5 + 0.5;
    vec4 col = mix(col1, col2, t);
    FragColor = vec4(col);
}