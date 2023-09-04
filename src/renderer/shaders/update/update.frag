#version 300 es
precision mediump float;

uniform sampler2D positionTexRead;
uniform sampler2D velocityTexRead;
uniform vec2 texDimentions;
uniform float deltaTime;

out vec4 FragColor;


void main(){

    vec2 texCoord =  gl_FragCoord.xy / texDimentions;

    vec3 position = texture(positionTexRead, texCoord).xyz;
    vec3 velocity = texture(velocityTexRead, texCoord).xyz;
    position += velocity * deltaTime;
    FragColor = vec4(1,0,0, 1.0);
}