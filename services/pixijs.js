/*
 * EarthStation v0.3
 * pixijs.js
 */

function PixiJS(WorkerManager) {
	// An example pixi.js setup
	// Currently familiarizing myself with this supposedly magnificent library

	var $container =  $('#three_d_display'); // $('#two_d_display');	// TEMP
	var container_width = $container.width();
	var container_height = $container.height();
	
	var stage;
	var renderer;
	var bunny;
	
	/* init()
		Initializes pixi.js scene
	 */
	function init() {
		console.log("PixiJS.init()");
		
		stage = new PIXI.Stage(0x66FF99);
		renderer = new PIXI.autoDetectRenderer(container_width, container_height);
		
		// add the renderer view element to the DOM
		$container.append(renderer.view);
		
		
		
		requestAnimFrame( animate );

		// create a texture from an image path
		var texture = PIXI.Texture.fromImage("../img/bunny.png");
		console.log("olleh???");
		// create a new Sprite using the texture
		bunny = new PIXI.Sprite(texture);
		bunny.anchor.x = 0.5;
		bunny.anchor.y = 0.5;
		
		// move the sprite to the center of the screen
		bunny.position.x = container_width/2;
		bunny.position.y = container_height/2;
		
		stage.addChild(bunny);
	} // end init()
	
	/* animate()
		yup.
	 */
	function animate() {
		console.log("animate()");
		requestAnimFrame( animate );
	
		// just for fun, lets rotate mr rabbit a little
		bunny.rotation += 0.1;
		
		// render the stage   
		renderer.render(stage);
	}
	
	return {
		// All the exposed functions of the PixiJS Service.
		// Should be enough to allow users of this service to
		// initialize, and add satellites, and move camera
		init: 						init,
		//start_animation:			start_animation,
	};
	
};