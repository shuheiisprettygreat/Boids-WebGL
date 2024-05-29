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

float gain(float x, float k){
    float a = 0.5 * pow(2.0 * (x<0.5 ? x : 1.0-x), k);
    return x<0.5 ? a : 1.0-a;
}

void main() {

    // FragColor = vec4(0.7,0.7,0.7,1);
    // return;
    // FragColor = texture(tex, iTex)*vec4(0.5,0.5,0.5,1.0);
    vec2 t = iTex - 0.5;
    // float d = length(t) * 0.96+0.02;
    // FragColor = texture(tex, vec2(d, 0));
    vec3 ref = texture(tex, gl_FragCoord.xy / res).rgb;
    
    
    float r = 0.1;
    float sdf = insideCircle(t, r);
    vec3 col = vec3(0.5,0.55,0.6);

    float i = clamp(length(t*8.0),0.0,1.0);
    i= gain(i,3.0);
    col *= mix(1.0, (ref.x==0.0 ? 0.7 : 1.0), i);

    float alpha = sdf < 0.0 ? 1.0 : mix(1.0, 0.0, sdf/(0.5-r));
    alpha = clamp(alpha, 0.0, 1.0);
    alpha = alpha*alpha;
    FragColor = vec4(col, alpha);
}