#version 300 es
precision mediump float;

in vec3 iPos;
in vec3 iNormal;
in vec2 iTex;

uniform vec3 camera;

out vec4 FragColor;

#define light vec3(20,10,10)

void main() {

    vec3 L = normalize(vec3(2,1,1));

    float diff = dot(iNormal, L);
    diff = clamp(diff, 0.0, 1.0);
    diff = diff*0.5 + 0.5;
    diff = diff*diff;
    vec3 diffuse = mix(vec3(0.3, 0.1, 0.1), vec3(1.0,1.0,0.7),diff);

    vec3 V = normalize(camera - iPos);
    vec3 H = normalize(normalize(light-iPos) + V);
    float spec = clamp(dot(iNormal, H), 0.0, 1.0);
    spec = pow(spec, 64.0);
    vec3 specular = vec3(spec);

    vec3 col = vec3(0.8);
    FragColor = vec4(col*diffuse + specular, 1.0);
}