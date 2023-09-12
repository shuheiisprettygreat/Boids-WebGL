#version 300 es
precision mediump float;

in vec2 iTex;

uniform sampler2D tex;

out vec4 FragColor;

void main()
{             
    vec4 col = texture(tex, iTex);
    FragColor = col;
    // float gray = col.y / 4169764.0;
    // FragColor = vec4(gray, gray, gray, 1.0);
}