# 🌱 MITTI KI BAAT

**Mitti Ki Baat** is a project dedicated to spreading awareness about soil, agriculture, and sustainable living. It aims to connect people with the importance of soil health and promote eco-friendly farming practices.

---

## 🚀 Features

* 🌾 Learn about soil and agriculture
* 📊 Awareness of soil health and sustainability
* 🧑‍🌾 Farmer-focused information
* 🌍 Promote eco-friendly and natural practices

---

## 🛠️ Tech Stack

* **Frontend:** HTML, CSS, JavaScript
* **Backend:** Node.js, Express
* **Database:** MongoDB (for users/inquiries), plus in-memory fallback for some runtime data

---

## 📂 Project Structure

MITTI_KI_BAAT/
│── index.html
│── style.css
│── script.js
│── assets/
│── README.md

---

## ⚙️ Installation & Setup

1. Clone the repository
   git clone https://github.com/rockabhishekak/MITTI_KI_BAAT.git

2. Go to project folder
   cd MITTI_KI_BAAT

3. Install dependencies
	npm install

4. Start the server
	npm start

5. Open in browser
	http://localhost:3000

---

## 📘 Learning Roadmap Implemented

### Step 1: JS Basics + DOM

* Dynamic page behavior initialized from a single controller in js/script.js.
* DOM queries and updates for identify, advisory, crops, and contact pages.

### Step 2: Events + Form Validation

* Button clicks and card click navigation handlers.
* Identify image selection and preview event handling.
* Contact form validation:
  * full name length
  * email format
  * message minimum length

### Step 3: Fetch API

* Frontend fetches live data from backend routes:
  * /api/crops
  * /api/faqs
  * /api/advisory/fall-armyworm
  * /api/stats

### Step 4: Async/Await

* All API calls in js/script.js use async/await with error handling.
* Async form submit and identify submit workflows.

### Step 5: Backend (Node + Express)

* Express server in server.js
* Static file serving for all pages and assets
* API endpoints:
  * GET /api/health
  * GET /api/crops
  * GET /api/faqs
  * GET /api/advisory/fall-armyworm
  * GET /api/stats
  * POST /api/identify
  * POST /api/contact

### Step 6: Perenual Integration

* The identify flow now proxies pest lookups through Perenual's pest-disease catalog.
* The API key is read from PERENUAL_API_KEY, with a local fallback in server.js.
* The result card updates its image and pest details from the best Perenual match when available.

---

## 📝 Notes

* Contact submissions are currently stored in memory while server is running.
* You can extend server.js to use MongoDB or another database for permanent storage.

---

## 📸 Screenshots

(Add your project screenshots here)

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a new branch (git checkout -b feature-name)
3. Commit your changes (git commit -m "Add feature")
4. Push to branch (git push origin feature-name)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Abhishek**
GitHub: https://github.com/rockabhishekak

---

## ⭐ Support

If you like this project, please give it a star on GitHub.
