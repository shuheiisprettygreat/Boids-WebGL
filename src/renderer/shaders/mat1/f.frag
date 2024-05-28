#version 300 es
precision mediump float;

in vec3 iNormal;
in vec2 iTex;
in float ivid;

uniform sampler2D tex;
uniform vec2 res;

out vec4 FragColor;

float insideCircle(vec2 p, float r){
    return length(p) - r;
}

void main() {

    // FragColor = vec4(0.7,0.7,0.7,1);
    // return;
    // FragColor = texture(tex, iTex)*vec4(0.5,0.5,0.5,1.0);
    vec2 t = iTex - 0.5;
    // float d = length(t) * 0.96+0.02;
    // FragColor = texture(tex, vec2(d, 0));
    vec3 ref = texture(tex, gl_FragCoord.xy / res).rgb;
    
    FragColor.xyz = vec3(0.6,0.65,0.5) * (ref.x==0.0 ? 0.7 : 1.0);
    
    float r = 0.1;
    float sdf = insideCircle(t, r);
    float alpha = sdf < 0.0 ? 1.0 : mix(1.0, 0.0, sdf/(0.5-r));
    alpha = clamp(alpha, 0.0, 1.0);
    alpha = alpha*alpha;
    FragColor = vec4(FragColor.xyz, alpha);
}