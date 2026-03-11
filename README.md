# Nitro Rush — High Speed Browser Racing Game

Nitro Rush is a high-speed arcade racing game built using pure HTML5 Canvas and JavaScript.  
The game delivers a smooth neon-style racing experience directly in the browser without any external game engine.

Players must steer their car through traffic, avoid obstacles, complete laps, and use nitro boost to reach maximum speed.

This project demonstrates strong fundamentals in browser-based game development, physics simulation, UI rendering, and responsive interaction using vanilla JavaScript.


## Live Gameplay Concept

Nitro Rush features a modern neon racing interface with a speedometer, nitro boost system, lap tracking, and difficulty levels.

The game runs entirely inside the browser using the HTML5 Canvas rendering system.


## Key Features

High-performance canvas rendering engine  
Multiple difficulty modes (Easy, Medium, Hard)  
Dynamic obstacle spawning system  
Real-time speedometer dashboard  
Nitro boost system with regeneration  
Lap-based racing system  
Collision detection and explosion particle effects  
Responsive keyboard and mobile touch controls  
Modern neon UI inspired by cyberpunk racing games  
Score system with best score tracking  
Animated HUD and game screens


## Game Controls

Keyboard Controls

Left Arrow or A  
Steer left

Right Arrow or D  
Steer right

Up Arrow or W  
Accelerate

Down Arrow or S  
Brake

Shift  
Activate Nitro Boost


Mobile Controls

On mobile devices, touch controls automatically appear on the screen.


## Technologies Used

HTML5  
CSS3  
JavaScript (Vanilla JS)  
HTML5 Canvas API


## Game Mechanics

The player controls a racing car positioned on a multi-lane highway.

The road continuously scrolls downward to simulate forward motion.

Obstacles spawn randomly in lanes and move toward the player.

If the player collides with an obstacle or drives off the road, the race ends.

Players must complete 3 laps to win the race.

The nitro system temporarily doubles the player's speed but drains energy while active.


## Project Structure

```

nitro-rush/
│
├── index.html      Main game file containing HTML, CSS, and JavaScript
├── README.md       Project documentation

```

This project is intentionally designed as a **single-file browser game** to keep the code portable and easy to deploy.


## Installation

No installation required.

Clone the repository and open the game in a browser.

```

git clone [https://github.com/CodeWithTanim/nitro-rush.git](https://github.com/CodeWithTanim/nitro-rush.git)
cd nitro-rush

```

Then open:

```

index.html

```

in any modern browser.


## Browser Support

Google Chrome  
Microsoft Edge  
Firefox  
Safari  


## Performance

The game uses `requestAnimationFrame()` for smooth animation rendering and optimized canvas drawing to maintain high frame rates.


## Future Improvements

Multiplayer racing mode  
AI opponent cars  
Sound effects and background music  
More track environments  
Car customization system  
Leaderboard system


## Author

MD SAMIUR RAHMAN TANIM  
B.Tech CSE Student | Programmer | Freelancer

GitHub  
https://github.com/CodeWithTanim

YouTube  
https://www.youtube.com/@codewithtanim

Instagram  
https://www.instagram.com/codewithtanim

Twitter/X  
https://x.com/codewithtanim


## License

This project is open source and available under the MIT License.
