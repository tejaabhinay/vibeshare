# Vibe Share 

Vibe Share is a full-stack social media application designed for seamless media sharing and community interaction. The goal was to create a robust platform that handles user data securely while providing a high-performance browsing experience.

### Technical Deep Dive
* **Authentication & Security:** Implemented `Passport.js` with `LocalStrategy`. Passwords are never stored in plain text; I used `bcrypt` for heavy-duty hashing to ensure user privacy.
* **Media Architecture:** Designed a dynamic feed system where posts are categorized and served based on timestamps.
* **State Management:** Leveraged React’s lifecycle methods (or Hooks) to ensure the UI updates instantly when a user interacts with a post.
* **Responsive Design:** Utilized a "Mobile-First" approach with Tailwind CSS, ensuring the grid layout remains fluid across 4K monitors and small smartphones.

### Tech Stack
* **Frontend:** React.js, Tailwind CSS, Lucide Icons
* **Backend:** Node.js, Express.js
* **Database:** MongoDB (Mongoose for Schema modeling)
* **Auth:** Passport.js, Express-Session

> **Hardest Challenge:** Handling asynchronous image rendering without layout shifts. I solved this by implementing skeleton loaders and aspect-ratio boxes.
> 
Crafted with Love by photographer 
