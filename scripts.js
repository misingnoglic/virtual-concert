 //sources
 // http://www.patrick-wied.at/blog/how-to-create-audio-visualizations-with-javascript-html
 // https://www.bignerdranch.com/blog/music-visualization-with-d3-js/
 // http://www.sitepoint.com/bringing-vr-to-web-google-cardboard-three-js/
 // 

 /*window.onload = function() {
		 console.log("hello");
	 	var ctx = new AudioContext();
	 	var audio = document.getElementById('myAudio');
	 	var audioSrc = ctx.createMediaElementSource(audio);
	 	var analyser = ctx.createAnalyser();
	 	// we have to connect the MediaElementSource with the analyser 
	 	audioSrc.connect(analyser);
	 	// we could configure the analyser: e.g. analyser.fftSize (for further infos read the spec)
	 
	 	// frequencyBinCount tells you how many values you'll receive from the analyser
	 	var frequencyData = new Uint8Array(analyser.frequencyBinCount);
	 
	 	// we're ready to receive some data!
	 	// loop
	 	audio.play()
	 };*/
 var scene,
   camera,
   renderer,
   element,
   container,
   effect,
   controls,
   clock,
   audio,
   lastChanged,
   currentBeat,

   //analyser,
   //frequencyData,

   // Particles
   particles = new THREE.Object3D(),
   totalParticles = 200,
   maxParticleSize = 50,
   particleRotationSpeed = 0,
   particleRotationDeg = 0,
   lastColorRange = [0, 0.3],
   currentColorRange = [0, 0.3],
   bpm = 123,
   played = false;
 var SMOOTHING = 0.8;
 var FFT_SIZE = 2048;

 // City and weather API set up
 cities = [
     ['Sydney', '2147714'],
     ['New York', '5128638'],
     ['Tokyo', '1850147'],
     ['London', '2643743'],
     ['Mexico City', '3530597'],
     ['Miami', '4164138'],
     ['San Francisco', '5391959'],
     ['Rome', '3169070']
   ],
   cityWeather = {},
   cityTimes = [],
   currentCity = 0,
   currentCityText = new THREE.TextGeometry(),
   currentCityTextMesh = new THREE.Mesh();

 init();

 function init() {
   //console.log("poop");
   /*audio = document.createElement('audio');
     var source = document.createElement('source');
     source.src = 'music/r.mp3';
     audio.appendChild(source);*/


   var audioCtx = new AudioContext();
   analyser = audioCtx.createAnalyser();
   var audioElement = document.getElementById('audioElement');
   var audioSrc = audioCtx.createMediaElementSource(audioElement);
   audioSrc.connect(analyser);
   audioSrc.connect(audioCtx.destination);


   frequencyData = new Uint8Array(totalParticles + 2); // Uint8Array should be the same length as the frequencyBinCount 
   //analyser.getByteFrequencyData(dataArray); // fill the Uint8Array with data returned from getByteFrequencyData()




   // Bind our analyser to the media element source.


   /*var ctx = new AudioContext();
   var audioSrc = ctx.createMediaElementSource(audio);
   var analyser = ctx.createAnalyser();*/
   console.log(audioElement.paused);
   console.log(audioElement.paused);
   scene = new THREE.Scene();
   camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.001, 700);
   camera.position.set(0, 15, 0);
   scene.add(camera);


   renderer = new THREE.WebGLRenderer();
   element = renderer.domElement;
   container = document.getElementById('webglviewer');
   container.appendChild(element);

   effect = new THREE.StereoEffect(renderer);

   // Our initial control fallback with mouse/touch events in case DeviceOrientation is not enabled
   controls = new THREE.OrbitControls(camera, element);
   controls.target.set(
     camera.position.x + 0.15,
     camera.position.y,
     camera.position.z
   );
   controls.noPan = true;
   controls.noZoom = true;

   // Our preferred controls via DeviceOrientation
   function setOrientationControls(e) {
     if (!e.alpha) {
       return;
     }

     controls = new THREE.DeviceOrientationControls(camera, true);
     controls.connect();
     controls.update();

     element.addEventListener('click', fullscreen, false);

     window.removeEventListener('deviceorientation', setOrientationControls, true);
   }
   window.addEventListener('deviceorientation', setOrientationControls, true);

   function playsong(e) {
     if (!e.alpha) {
       return;
     }
     if (!played) {
       song.play();
       played = true;
     }
     window.removeEventListener('ontouchstart', playsong, true);
   }
   window.addEventListener('ontouchstart', playsong, true);

   // Lighting
   var light = new THREE.PointLight(0x999999, 0.5, 100);
   light.position.set(50, 50, 50);
   scene.add(light);

   var lightScene = new THREE.PointLight(0x999999, 0.5, 100);
   lightScene.position.set(0, 5, 0);
   scene.add(lightScene);

   var floorTexture = THREE.ImageUtils.loadTexture('textures/wood.jpg');
   floorTexture.wrapS = THREE.RepeatWrapping;
   floorTexture.wrapT = THREE.RepeatWrapping;
   floorTexture.repeat = new THREE.Vector2(50, 50);
   floorTexture.anisotropy = renderer.getMaxAnisotropy();

   var floorMaterial = new THREE.MeshPhongMaterial({
     color: 0xffffff,
     specular: 0xffffff,
     shininess: 20,
     shading: THREE.FlatShading,
     map: floorTexture
   });



   /*var song = new Audio('music/bs.mp3');
    	  if (!played){
    			song.play();
    			played = true;
    		}*/
   var geometry = new THREE.PlaneBufferGeometry(1000, 1000);

   var floor = new THREE.Mesh(geometry, floorMaterial);
   floor.rotation.x = -Math.PI / 2;
   scene.add(floor);

   var particleTexture = THREE.ImageUtils.loadTexture('textures/particle.png'),
     spriteMaterial = new THREE.SpriteMaterial({
       map: particleTexture,
       color: 0xffffff
     });

   for (var i = 0; i < totalParticles; i++) {
     var sprite = new THREE.Sprite(spriteMaterial);

     sprite.scale.set(64, 64, 1.0);
     sprite.position.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.75);
     sprite.position.setLength(maxParticleSize * Math.random());

     sprite.material.blending = THREE.AdditiveBlending;

     particles.add(sprite);
   }
   particles.position.y = 70;
   scene.add(particles);

   adjustToWeatherConditions();


   clock = new THREE.Clock();

   animate();
 }

 function adjustToWeatherConditions() {
   var cityIDs = '';
   for (var i = 0; i < cities.length; i++) {
     cityIDs += cities[i][1];
     if (i != cities.length - 1) cityIDs += ',';
   }
   lookupTimezones(0, cities.length);

 }

 function lookupTimezones(t, len) {
   cityTimes.push(getRandomInt(0, 24));

   t++;
   if (t < len) {
     lookupTimezones(t, len);
   } else {
     applyWeatherConditions();
   }
 }

 function changeDirection() {
   if (particleRotationDeg = 179) {
     particleRotationDeg = 181;
   } else {
     particleRotationDeg = 179;
   }
 }

 function applyWeatherConditions() {
   displayCurrentCityName(1);
   if (currentBeat % 4 == 0 && currentBeat != lastChanged) {
     var change = true;
   }
   particleRotationSpeed = frequencyData[0] / 500;
   // dividing by 2 just to slow things down
   changeDirection();

   //particleRotationDeg = info.wind.deg;

   /*var dd = getRandomInt(1,4);
        if (isDay) {
          switch (dd) {
            case 1:
              currentColorRange = [0, 0.01];
              break;
            case 2:
              currentColorRange = [0.7, 0.1];
              break;
            case 3:
            default:
              currentColorRange = [0.6, 0.7];
              break;
          }
        } else {
          currentColorRange = [0.69, 0.6];
        }*/

   if (currentCity < cities.length - 1) currentCity++;
   else currentCity = 0;

   setTimeout(applyWeatherConditions, (1 / bpm) * 60 * 1000 * 4);
 }

 function displayCurrentCityName(name) {
   scene.remove(currentCityTextMesh);

   currentCityText = new THREE.TextGeometry(name, {
     size: 4,
     height: 1
   });
   currentCityTextMesh = new THREE.Mesh(currentCityText, new THREE.MeshBasicMaterial({
     color: 0xffffff,
     opacity: 1
   }));

   currentCityTextMesh.position.y = 10;
   currentCityTextMesh.position.z = 20;
   currentCityTextMesh.rotation.x = 0;
   currentCityTextMesh.rotation.y = -180;

   scene.add(currentCityTextMesh);
 }

 function animate() {
   var elapsedSeconds = clock.getElapsedTime(),
     particleRotationDirection = particleRotationDeg <= 180 ? -1 : 1;
   //displayCurrentCityName(((elapsedSeconds*bpm)/60)/4);
   //

   newBeat = Math.floor((elapsedSeconds * (bpm / 60)))
   displayCurrentCityName((elapsedSeconds * (bpm / 60)).toFixed(1));
   if (elapsedSeconds > (1 / bpm) * 60 * 4) {
     if (!played) {
       document.getElementById('audioElement').play()
       //audio.play();
       played = true;
     }
   }
   if (played) {
     analyser.getByteFrequencyData(frequencyData);
   }
   currentColorRange = [frequencyData[1] / 200, frequencyData[2] / 200]
   if (newBeat != currentBeat) {
     x = 2;
     //particleRotationSpeed = frequencyData[0]/500;
   }

   currentBeat = newBeat;

   particles.rotation.y = elapsedSeconds * particleRotationSpeed * particleRotationDirection;

   // We check if the color range has changed, if so, we'll change the colours
   if (lastColorRange[0] != currentColorRange[0] && lastColorRange[1] != currentColorRange[1]) {

     for (var i = 0; i < totalParticles; i++) {
       particles.children[i].material.color.setHSL((frequencyData[i] - 75) / 100, (frequencyData[i + 1] - 75) / 100, (frequencyData[i + 2] - 75) / 100);

     }

     lastColorRange = currentColorRange;
   }

   requestAnimationFrame(animate);

   update(clock.getDelta());
   render(clock.getDelta());
 }

 function resize() {
   var width = container.offsetWidth;
   var height = container.offsetHeight;

   camera.aspect = width / height;
   camera.updateProjectionMatrix();

   renderer.setSize(width, height);
   effect.setSize(width, height);
 }

 function update(dt) {
   resize();

   camera.updateProjectionMatrix();

   controls.update(dt);
 }

 function render(dt) {

   effect.render(scene, camera);
 }

 function fullscreen() {
   if (container.requestFullscreen) {
     container.requestFullscreen();
   } else if (container.msRequestFullscreen) {
     container.msRequestFullscreen();
   } else if (container.mozRequestFullScreen) {
     container.mozRequestFullScreen();
   } else if (container.webkitRequestFullscreen) {
     container.webkitRequestFullscreen();
   }
 }

 function getRandomInt(min, max) {
   return Math.floor(Math.random() * (max - min + 1)) + min;
 }

 function getURL(url, callback) {
   var xmlhttp = new XMLHttpRequest();

   xmlhttp.onreadystatechange = function () {
     if (xmlhttp.readyState == 4) {
       if (xmlhttp.status == 200) {
         callback(JSON.parse(xmlhttp.responseText));
       } else {
         console.log('We had an error, status code: ', xmlhttp.status);
       }
     }
   }

   xmlhttp.open('GET', url, true);
   xmlhttp.send();
 }