
///
class Renderer {

    //---------------------------------------
    constructor(){

        this.canvas = document.createElement("canvas");

        this.refId = 0;
        this.frameCount = -1;
        this.timeDelta = -1;
        this.camera = null;

        this.pointerLocked = false;

        // event call-backs -------------
        this.canvas.addEventListener("click", async () => {
            await this.canvas.requestPointerLock();
            this.OnClick();
        });

        this.canvas.onwheel = function(event){
            event.preventDefault();
        };
        
        const fps = 50;
        let interval = 1000.0/fps;
        let prevTime = performance.now() - interval;

        this.timestamp = 0;
        this.timeDelta = interval;

        this.frameCallback = () => {
            let currentTime = performance.now();
            let updated = false;

            while(currentTime - prevTime > interval * 0.5){
                this.beforeFrame(currentTime, 0);
                updated = true;
                prevTime += interval;
                const now = performance.now();
                const updateTime = now - currentTime;
                if(updateTime > interval * 0.5){
                    if(prevTime < now - interval){
                        prevTime = now - interval;
                    }
                }
                break;
            }

            if(updated){
                this.OnFrame();
            }

            this.refId = requestAnimationFrame(this.frameCallback);
        };
    
        this.resizeCallback = (event) => {
            const scalar = Math.min(devicePixelRatio, 1.5);

            this.canvas.width = this.canvas.clientWidth * scalar;
            this.canvas.height = this.canvas.clientHeight * scalar;

            if(this.canvas.width == 0 || this.canvas.height == 0){
                return;
            }

            const aspect = this.canvas.width / this.canvas.height;

            this.OnResize(this.canvas.width, this.canvas.height);
        }


        this.key2pressed = {};
        this.keydownCallback = (event) => {
            this.key2pressed[event.keyCode] = true;
        }

        this.keyupCallback = (event) => {
            this.key2pressed[event.keyCode] = false;
        }
                
        this.mouseMoveCallback = (event) => {
            if(document.pointerLockElement === this.canvas){
                let dx = event.movementX;
                let dy = event.movementY;

                this.camera.processRotation(dx, dy);
            }
        }

        this.clickCallback = (event) => {
            this.OnClick();
        }

        let startX = 0
        let startY = 0
        let endX = 0
        let endY = 0
        let minimumDistance = 2;
        let touchMoved = false;

        this.touchStartCallback = (event) =>  {
            startX = event.touches[0].pageX;
            startY = event.touches[0].pageY;
            touchMoved = false;
        }

        this.touchMoveCallback = (event) =>  {
            endX = event.changedTouches[0].pageX;
            endY = event.changedTouches[0].pageY;
            const distanceX = endX - startX;
            const distanceY = endY - startY;
            if(distanceX*distanceX + distanceY*distanceY > minimumDistance*minimumDistance){
                this.camera.processRotation(distanceX, distanceY);
                startX = endX;
                startY = endY;
                touchMoved = true;
            }
        }

        this.touchEndCallback = (event) => {
            if(!touchMoved){
                this.OnClick();
            }
        }

        this.mouseWheelCallback = (event) => {
            this.camera.processZoom(event.wheelDelta);
        }

        this.mouseMoveCallback
    }

    //---------------------------------------
    start(){
        window.addEventListener('resize', this.resizeCallback);
        window.addEventListener('keydown', this.keydownCallback);
        window.addEventListener('keyup', this.keyupCallback);
        window.addEventListener('mousemove', this.mouseMoveCallback);
        // window.addEventListener('click', this.clickCallback);
        window.addEventListener('wheel', this.mouseWheelCallback);
        window.addEventListener('touchstart', this.touchStartCallback);
        window.addEventListener('touchmove', this.touchMoveCallback);
        window.addEventListener('touchend', this.touchEndCallback);
        this.resizeCallback();
        
        // this.canvas.requestPointerLock();
        this.refId = requestAnimationFrame(this.frameCallback);
    }


    //---------------------------------------
    async init(){
        // Override with renderer-specific resize logic.
    }

    OnResize(width, height){
        // Override with renderer-specific logic.
    }

    beforeFrame(){
        // Override with renderer-specific logic.
    }
    
    OnFrame(){
        // Process Inputs
        this.processKeyInput();        
    }

    OnClick(){
    }

    //---------------------------------------
    processKeyInput(){
        if(this.key2pressed[65]){
            // A
            this.camera.processMovement(0, this.timeDelta);
        }
        if(this.key2pressed[68]){
            // D
            this.camera.processMovement(1, this.timeDelta);
        }
        if(this.key2pressed[87]){
            // W
            this.camera.processMovement(2, this.timeDelta);
        }
        if(this.key2pressed[83]){
            // S
            this.camera.processMovement(3, this.timeDelta);
        }

        // ←↑→↓
        if(this.key2pressed[37]){
            this.camera.processRotation(-20,0);
        }
        if(this.key2pressed[38]){
            this.camera.processRotation(0,-20);
        }
        if(this.key2pressed[39]){
            this.camera.processRotation(20,0);
        }
        if(this.key2pressed[40]){
            this.camera.processRotation(0,20);
        }
    }

}

export {Renderer}