/*
 * EarthStation v0.3
 * pixijs.js
 */

function PixiJS(WorkerManager) {
	// An example pixi.js setup
	// Currently familiarizing myself with this supposedly magnificent library

	var $container = $('#three_d_display');
	
	function init() {
		console.log("PixiJS.init()");
		
		var stage = new PIXI.Stage(0x66FF99);
		var renderer = PIXI.autoDetectRenderer(400, 300);
		
		// add the renderer view element to the DOM
		//document.body.appendChild(renderer.view);
		$container.body.appendChild(renderer.view);
		
		
		
		requestAnimFrame( animate );

		// create a texture from an image path
		var texture = PIXI.Texture.fromImage("../img/bunny.png");
		console.log("olleh???");
		// create a new Sprite using the texture
		var bunny = new PIXI.Sprite(texture);
		bunny.anchor.x = 0.5;
		bunny.anchor.y = 0.5;
		
		// move the sprite to the center of the screen
		bunny.position.x = 200;
		bunny.position.y = 150;
		
		stage.addChild(bunny);
		
		function animate() {
			console.log("animate()");
			requestAnimFrame( animate );
		
			// just for fun, lets rotate mr rabbit a little
			bunny.rotation += 0.1;
			
			// render the stage   
			renderer.render(stage);
		}
	}
	
	return {
		// All the exposed functions of the PixiJS Service.
		// Should be enough to allow users of this service to
		// initialize, and add satellites, and move camera
		init: 						init,
		//start_animation:			start_animation,
	};
	
};