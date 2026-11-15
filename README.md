A technology learning and digital marketplace platform.

ZORVI is a technology education and digital marketplace platform designed to help people move from learning programming to building and launching real-world software projects.

The platform combines practical technology education with a marketplace where developers can discover digital products, explore demonstrations, and access complete project resources.

Instead of focusing only on theoretical lessons, ZORVI aims to connect learning with practical implementation.

Learn. Create. Launch.
- Structured learning experiences.
- Practical programming lessons.
- Project-based learning.
- A foundation for developing real-world technical skills.
- Browse and discover digital products.
- Explore project descriptions and demonstrations.
- Different product packages and licensing options.
- Access digital resources after purchase.
- User registration and authentication.
- Secure login and account management.
- Protected user-specific functionality.
- Digital product ordering.
- Order management.
- Secure download access.
- Time-limited download links and token protection.
- Administrative functionality.
- Marketplace and product management.
- Order management.
- User and platform operations.
ZORVI is built using a modern web architecture.
Layer	Technology
Frontend	Next.js 15
UI Library	React 19
Language	TypeScript
Styling	Tailwind CSS
Animation	Motion
Icons	Lucide React
Backend	Python, FastAPI
Database	PostgreSQL
ORM	SQLAlchemy
Database Migrations	Alembic
Data Validation	Pydantic
Authentication	JWT
Password Security	Argon2id
API Server	Uvicorn
The platform uses a separated frontend and backend architecture.
```
                    ZORVI PLATFORM
                          |
             +------------+------------+
             |                         |
        FRONTEND                    BACKEND
             |                         |
       Next.js 15                  FastAPI
       React 19                       |
       TypeScript              Business Logic
       Tailwind CSS                   |
             |                  SQLAlchemy
             |                         |
             +---------- API ----------+
                                       |
                                  PostgreSQL
```
Security is an important part of the platform's backend design.

Implemented security mechanisms include:
- Argon2id password hashing.
- JWT-based authentication.
- Access and refresh token handling.
- Refresh-token rotation and revocation.
- Protected API endpoints.
- Expiring digital download tokens.
- Single-use download access.
- File path traversal protection.
```
zorvi/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── public/
│   ├── package.json
│   └── next.config.ts
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── ...
│   ├── requirements.txt
│   └── ...
│
├── README.md
└── .gitignore
```
Note: The structure above illustrates the main application areas. Actual backend subdirectories and configuration files may vary.
Install the following before running the project:
- Node.js
- Python 3.12+
- PostgreSQL
- Git
```
git clone https://github.com/ibrahim-talib-ds/zorvi.git

cd zorvi
```
Open a terminal:
```
cd backend
```
Create a virtual environment:
```
python -m venv .venv
```
Activate it on Linux or macOS:
```
source .venv/bin/activate
```
Install dependencies:
```
pip install -r requirements.txt
```
Configure your environment variables using the provided example environment file, and make sure PostgreSQL is running with the correct database credentials.

Start the API:
```
uvicorn app.main:app --reload
```
The API will normally be available at:
```
http://127.0.0.1:8000
```
Interactive API documentation:
```
http://127.0.0.1:8000/docs
```
Open another terminal:
```
cd frontend
```
Install dependencies:
```
npm install
```
Start the development server:
```
npm run dev
```
Open:
```
http://localhost:3000
```
ZORVI is actively developed, with a focus on:
- Maintainable application architecture.
- Secure backend operations.
- Responsive user interfaces.
- Reliable database operations.
- Practical end-to-end workflows.
- Continuous testing and improvements.
The goal of ZORVI is to make technology education more practical and accessible while creating opportunities for developers to build, demonstrate, and sell real software products.

ZORVI brings three important ideas together:
1. Learn — Develop practical technical knowledge.
2. Create — Build real applications and digital products.
3. Launch — Turn completed projects into useful products and opportunities.
Detail	Information
Project	ZORVI
Category	Technology Education & Digital Marketplace
Frontend	Next.js
Backend	FastAPI
Database	PostgreSQL
Repository	[GitHub](https://github.com/ibrahim-talib-ds/zorvi)
Live Preview	[ibrant.vercel.app](https://ibrant.vercel.app)
Status	Active Development
Ibrahim Talib

Software Developer | Data Science

Interested in building practical software products, data-driven solutions, and technology platforms.
<p align="center">   <strong>ZORVI</strong><br/>   Learn. Create. Launch. </p>

<p align="center">   Built with passion for technology and innovation. </p>change from zorvi to ibrant
