# Homecooked

Good food. Real people.

## Project Overview

Homecooked is a mobile marketplace that connects home cooks with customers interested in purchasing homemade meals. The application provides a platform for local cooks to share their cooking, manage food listings, and receive orders from their community.

Homecooked aims to make homemade food more accessible while creating opportunities for home cooks to earn income through their culinary skills.

## Key Features

### Authentication and Account Security

- User registration and login
- Email verification
- Password recovery through email
- Secure password changes
- Persistent user sessions

### User Profiles

- Customizable user profiles
- Profile picture uploads
- Personal biographies and location information
- Home cook account settings
- Persistent profile information

### Food Marketplace

- Browse available homemade meals
- Search meals by name, description, or location
- Filter meals by price and location
- View meal photographs, descriptions, prices, and available portions

### Home Cook Dashboard

- Create, edit, and delete food listings
- Upload meal photographs
- Manage pricing and available portions
- Control listing availability
- View kitchen statistics
- Manage incoming customer orders

### Ordering System

- Select meal quantities
- Automatically calculate order totals
- Place and track customer orders
- Accept, decline, and complete incoming orders
- Cancel pending orders
- Automatically update available inventory
- Restore inventory when orders are cancelled or declined

### User Interface

- Consistent visual identity
- Mobile-friendly navigation
- Interactive meal cards
- Order status indicators
- Loading states and error handling
- Form validation and confirmation dialogs

## Technology Stack

| Technology | Purpose |
|---|---|
| React Native | Mobile application development |
| Expo | Development and mobile testing |
| TypeScript | Type-safe application development |
| Supabase | Backend services |
| PostgreSQL | Database management |
| Supabase Auth | Authentication and account security |
| Supabase Storage | Profile and meal image storage |
| GitHub | Version control and repository hosting |
| GitHub Pages | Hosted email confirmation and password recovery |

## Database Architecture

The application uses Supabase and PostgreSQL to manage persistent application data.

### Database Tables

- profiles: Stores user information, profile pictures, locations, and home cook settings.
- listings: Stores meal information, photographs, pricing, availability, and inventory.
- orders: Stores customer orders, quantities, prices, and order statuses.

### Storage Buckets

- avatars: Stores user profile pictures.
- food-images: Stores photographs associated with meal listings.

### Security

- Row-Level Security (RLS)
- Authenticated database access
- User-specific storage permissions
- Server-side order validation
- Transactional inventory management

## Getting Started

### Prerequisites

- Node.js
- npm
- Git
- Expo Go
- A configured Supabase project

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/OperatedOcean/home-cooked-marketplace.git
   ```

2. Navigate to the project directory:

   ```bash
   cd home-cooked-marketplace
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Create a .env.local file in the project directory:

   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_KEY=your_supabase_publishable_key
   ```

5. Configure the required Supabase database tables, storage buckets, security policies, and database functions.

6. Start the Expo development server:

   ```bash
   npx expo start
   ```

7. Scan the QR code using Expo Go or launch the application on a compatible emulator.

## Future Improvements

- Online payment integration
- Customer reviews and ratings
- Direct messaging between cooks and customers
- Pickup and delivery scheduling
- Push notifications
- Location-based meal recommendations
- Favorite meals and cooks

## Current Development Status

Homecooked is a functional marketplace prototype with persistent authentication, user profiles, food listings, image storage, order management, and automatic inventory tracking.

Online payments are not currently supported. Orders can be placed and managed without collecting payment through the application.

## Mission

To bring communities together through homemade food while empowering local home cooks to share their passion and grow their businesses.

Homecooked - Good food. Better together.