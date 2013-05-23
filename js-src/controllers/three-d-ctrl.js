function ThreeDCtrl($scope) {
  var three_d_running = false;
  var camera, scene, renderer, earth, skybox, camera_pivot;
  var request_id;
  var $container  = $('#chrome_app');
  var WIDTH       = $container.width(),
      HEIGHT      = $container.height();
  var VIEW_ANGLE  = 35,
      ASPECT      = WIDTH / HEIGHT,
      NEAR        = 0.1,
      FAR         = 1000000;

  init();
  animate();

  function init (){
    // Initialize the big three
    renderer    = new THREE.WebGLRenderer();
    camera      = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    camera.position.x = 70000;
    camera.lookAt ( new THREE.Vector3 (0, 0, 0) );
    camera.up = new THREE.Vector3( 0, 0, 1 );
    scene       = new THREE.Scene();

    // Add initialized renderer to the DOM
    renderer.setSize(WIDTH, HEIGHT);
    $container.append(renderer.domElement);

    // Set the skybox properties.
    var skybox_radius      = 100000,
        skybox_segments    = 500,
        skybox_rings       = 100;
    var skybox_sphere      = new THREE.SphereGeometry( skybox_radius, skybox_segments, skybox_rings );
    var skybox_texture     = new THREE.ImageUtils.loadTexture("img/stars.jpg");
    var skybox_material    = new THREE.MeshBasicMaterial({ map: skybox_texture, wireframe: false, side: THREE.BackSide});
    // Create map 3D object
    skybox = new THREE.Mesh(skybox_sphere, skybox_material);

    // Set the globes properties.
    var earth_radius      = 6378,
        earth_segments    = 500,
        earth_rings       = 100;
    var earth_sphere      = new THREE.SphereGeometry( earth_radius, earth_segments, earth_rings );
    var earth_texture     = new THREE.ImageUtils.loadTexture("img/world.jpg");
    var earth_material    = new THREE.MeshBasicMaterial({ map: earth_texture, wireframe: false });
    // Create map 3D object
    earth = new THREE.Mesh(earth_sphere, earth_material);

    // Rotating this pivot allows reasonable camera manipulations.
    camera_pivot = new THREE.Object3D();
    earth.add( camera_pivot );
    camera_pivot.add( camera );

    // Add the Earth and Sky to the scene
    scene.add(skybox);
    scene.add(earth);

    // when window is ready, render
    three_d_running = true;
    $(window).load(function() {
        renderer.render(scene, camera);
    });
  };

  function animate() {
    if (three_d_running){
      request_id = requestAnimationFrame( animate );
      renderer.render( scene, camera );
    }
  };

};
