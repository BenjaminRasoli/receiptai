# ReceiptAI (Smart Inventory & Sales Tracker)

ReceiptAI is a modern inventory and resale tracking web application where users can manage purchases, track items, and mark products as sold using AI-powered receipt parsing. Built with Next.js, Tailwind, TypeScript, and Firebase, ReceiptAI makes it easy to track profit, inventory, and sales across devices.

---

## 🚀 Live Demo
Check out the live version of here: [ReceiptsAI.vercel.app](https://receiptsai.vercel.app/)


---

## Features

🔐 **User Authentication**
Secure sign-up and login system powered by Firebase Authentication with full per-user data separation.

📥 **AI Receipt Parsing (Purchases)**
Paste raw purchase receipt text and Google AI automatically extracts structured item data into your inventory.

💸 **Smart Sold Item Tracking**
Paste sold receipt text and AI helps identify which existing inventory item was sold. Users can:

* Select an existing item from a modal
* Confirm or edit:

  * Sold price
  * Sold date
  * Platform

📊 **Profit & Analytics Dashboard**
Track:

* Total spent
* Total earned
* Profit calculation
* Inventory vs sold items

🔥 **Firestore Sync**
All items are stored per-user in Firebase Firestore and synced across devices in real time.

🗂 **Inventory Management**
Full CRUD support:

* Add items manually
* Edit items
* Delete items
* Mark as sold

📱 **Responsive Design**
Fully responsive UI built with Tailwind CSS for mobile, tablet, and desktop.

⚡ **Fast & Modern UI**
Built with Next.js App Router and optimized client-side state management.

---

## 🛠 Technologies Used

**Frontend:**
Next.js, React, TypeScript, Tailwind CSS

**Backend / Database:**
Firebase Authentication, Firestore

**AI Integration:**
Google AI (receipt parsing & structured data extraction)
