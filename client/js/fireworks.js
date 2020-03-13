/**
 * Copyright 2011 Paul Lewis. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var Fireworks = (function () {
  var particles = [],
    mainCanvas = null,
    mainContext = null,
    fireworkCanvas = null,
    fireworkContext = null,
    viewportWidth = 0,
    viewportHeight = 0;

  var sku = "";
  var str_SmallFireworks = "small";
  var str_LargeFireworks = "large";


  function initialize(sku_from_config) {
    sku = sku_from_config;

    // start by measuring the viewport
    onWindowResize();

    // create a canvas for the fireworks
    mainCanvas = document.createElement('canvas');
    mainContext = mainCanvas.getContext('2d');

    // and another one for, like, an off screen buffer
    // because that's rad n all
    fireworkCanvas = document.createElement('canvas');
    fireworkContext = fireworkCanvas.getContext('2d');

    // set up the colours for the fireworks
    createFireworkPalette(12);

    // set the dimensions on the canvas
    setMainCanvasDimensions();

    // add the canvas in
    document.body.appendChild(mainCanvas);

    //Create firework
    createFirework();

    // and now we set off
    update();

    //Remove the canvas after 7 seconds so we can see the button again
    setTimeout(function () {
      mainCanvas.remove();
      fireworkCanvas.remove();
      document.getElementById('fireworksBtn').style.visibility = 'visible';
    }, 7000);
  }

  /**
   * Pass through function to create a
   * new firework on touch / click
   */
  function createFirework() {
    createParticle();
  }

  /**
   * Creates a block of colours for the
   * fireworks to use as their colouring
   */
  function createFireworkPalette(gridSize) {

    var size = gridSize * 10;
    fireworkCanvas.width = size;
    fireworkCanvas.height = size;
    fireworkContext.globalCompositeOperation = 'source-over';

    // create 100 blocks which cycle through
    // the rainbow... HSL is teh r0xx0rz
    for (var c = 0; c < 100; c++) {

      var marker = (c * gridSize);
      var gridX = marker % size;
      var gridY = Math.floor(marker / size) * gridSize;

      fireworkContext.fillStyle = "hsl(" + Math.round(c * 3.6) + ",100%,60%)";
      fireworkContext.fillRect(gridX, gridY, gridSize, gridSize);
      document.getElementById('big-glow').onload = function () {
        fireworkContext.drawImage(
          Library.bigGlow,
          gridX,
          gridY);
      }
    }
  }

  /**
   * Update the canvas based on the
   * detected viewport size
   */
  function setMainCanvasDimensions() {
    mainCanvas.width = viewportWidth;
    mainCanvas.height = viewportHeight;
  }

  /**
   * The main loop where everything happens
   */
  function update() {
    requestAnimFrame(update);
    drawFireworks();
  }

  /**
   * Passes over all particles particles
   * and draws them
   */
  function drawFireworks() {
    var a = particles.length;

    while (a--) {
      var firework = particles[a];

      // if the update comes back as true
      // then our firework should explode
      if (firework.update()) {

        // kill off the firework, replace it
        // with the particles for the exploded version
        particles.splice(a, 1);

        // if the firework isn't using physics
        // then we know we can safely(!) explode it... yeah.
        if (!firework.usePhysics) {
          FireworkExplosions.circle(firework);
        }
      }

      // pass the canvas context and the firework
      // colours to the
      firework.render(mainContext, fireworkCanvas);
    }
  }

  /**
   * Creates a new particle / firework
   */
  function createParticle(pos, target, vel, color, usePhysics) {

    pos = pos || {};
    target = target || {};
    vel = vel || {};

    //Determine velocity based on which sku is active
    var adjust = 0.0;
    if (sku.includes(str_SmallFireworks)) {
      adjust = 0.25;
    }
    else if (sku.includes(str_LargeFireworks)) {
      adjust = 1.0;
    }
    var velX = vel.x * adjust;
    var velY = vel.y * adjust;

    particles.push(
      new Particle(
        // position
        {
          x: pos.x || viewportWidth * 0.5,
          y: pos.y || viewportHeight + 10
        },

        // target
        {
          y: target.y || 150 + Math.random() * 100
        },

        // velocity
        {
          x: velX || Math.random() * 3 - 1.5,
          y: velY || 0
        },

        color || Math.floor(Math.random() * 100) * 12,

        usePhysics)
    );
  }

  /**
   * Callback for window resizing -
   * sets the viewport dimensions
   */
  function onWindowResize() {
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
  }

  // declare an API
  return {
    initialize: initialize,
    createParticle: createParticle
  };

})();

/**
 * Represents a single point, so the firework being fired up
 * into the air, or a point in the exploded firework
 */
var Particle = function (pos, target, vel, marker, usePhysics) {

  // properties for animation
  // and colouring
  this.GRAVITY = 0.06;
  this.alpha = 1;
  this.easing = Math.random() * 0.02;
  this.fade = Math.random() * 0.1;
  this.gridX = marker % 120;
  this.gridY = Math.floor(marker / 120) * 12;
  this.color = marker;

  this.pos = {
    x: pos.x || 0,
    y: pos.y || 0
  };

  this.vel = {
    x: vel.x || 0,
    y: vel.y || 0
  };

  this.lastPos = {
    x: this.pos.x,
    y: this.pos.y
  };

  this.target = {
    y: target.y || 0
  };

  this.usePhysics = usePhysics || false;

};

/**
 * Functions that we'd rather like to be
 * available to all our particles, such
 * as updating and rendering
 */
Particle.prototype = {

  update: function () {

    this.lastPos.x = this.pos.x;
    this.lastPos.y = this.pos.y;

    if (this.usePhysics) {
      this.vel.y += this.GRAVITY;
      this.pos.y += this.vel.y;

      // since this value will drop below
      // zero we'll occasionally see flicker,
      // ... just like in real life! Woo! xD
      this.alpha -= this.fade;
    } else {

      var distance = (this.target.y - this.pos.y);

      // ease the position
      this.pos.y += distance * (0.03 + this.easing);

      // cap to 1
      this.alpha = Math.min(distance * distance * 0.00005, 1);
    }

    this.pos.x += this.vel.x;

    return (this.alpha < 0.005);
  },

  render: function (context, fireworkCanvas) {

    var x = Math.round(this.pos.x),
      y = Math.round(this.pos.y),
      xVel = (x - this.lastPos.x) * -5,
      yVel = (y - this.lastPos.y) * -5;

    context.save();
    context.globalCompositeOperation = 'lighter';
    context.globalAlpha = Math.random() * this.alpha;

    // draw the line from where we were to where
    // we are now
    context.fillStyle = "rgba(255,255,255,0.3)";
    context.beginPath();
    context.moveTo(this.pos.x, this.pos.y);
    context.lineTo(this.pos.x + 1.5, this.pos.y);
    context.lineTo(this.pos.x + xVel, this.pos.y + yVel);
    context.lineTo(this.pos.x - 1.5, this.pos.y);
    context.closePath();
    context.fill();

    // draw in the images
    context.drawImage(fireworkCanvas,
      this.gridX, this.gridY, 12, 12,
      x - 6, y - 6, 12, 12);
    document.getElementById('small-glow').onload = function () {
      context.drawImage(Library.smallGlow, x - 3, y - 3);
    }


    context.restore();
  }

};

/**
 * Stores references to the images that
 * we want to reference later on
 */
var Library = {
  bigGlow: document.getElementById('big-glow'),
  smallGlow: document.getElementById('small-glow')
};

/**
 * Stores a collection of functions that
 * we can use for the firework explosions. Always
 * takes a firework (Particle) as its parameter
 */
var FireworkExplosions = {

  /**
   * Explodes in a roughly circular fashion
   */
  circle: function (firework) {

    var count = 100;
    var angle = (Math.PI * 2) / count;
    while (count--) {

      var randomVelocity = 4 + Math.random() * 2;
      var particleAngle = count * angle;

      Fireworks.createParticle(
        firework.pos,
        null,
        {
          x: Math.cos(particleAngle) * randomVelocity,
          y: Math.sin(particleAngle) * randomVelocity
        },
        firework.color,
        true);
    }
  }
};

// Go
function launchFireworks(sku_from_config) {
  document.getElementById('fireworksBtn').style.visibility = 'hidden';
  console.log(document.getElementById('fireworksBtn'))
  Fireworks.initialize(sku_from_config);
};
