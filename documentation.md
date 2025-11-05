# TransitFLOW Documentation

This documentation provides a detailed overview of the TransitFLOW API and data models.

## API Endpoints

### Authentication

- `POST /api/auth/register`: Register a new user.
- `POST /api/auth/login`: Log in a user.
- `POST /api/auth/logout`: Log out a user.
- `POST /api/auth/verify-email`: Verify a user's email address.
- `POST /api/auth/forgot-password`: Request a password reset.
- `POST /api/auth/reset-password`: Reset a user's password.

### User

- `GET /api/users/me`: Get the currently authenticated user.
- `PUT /api/users/me`: Update the currently authenticated user.
- `DELETE /api/users/me`: Delete the currently authenticated user.

## Data Models

### User

The `User` model represents a user of the application. It contains the following fields:

- `username`: The user's username.
- `email`: The user's email address.
- `passwordHash`: The user's hashed password.
- `role`: The user's role (`user` or `admin`).
- `isEmailVerified`: A boolean indicating whether the user's email address has been verified.
- `createdAt`: The date and time the user was created.
- `updatedAt`: The date and time the user was last updated.

### Device

The `Device` model represents a device that a user has used to log in. It contains the following fields:

- `deviceId`: A unique identifier for the device.
- `deviceName`: The name of the device.
- `userAgent`: The user agent of the device.
- `platform`: The platform of the device.
- `browser`: The browser of the device.
- `os`: The operating system of the device.
- `ipAddress`: The IP address of the device.
- `location`: The location of the device.
- `firstUsed`: The date and time the device was first used.
- `lastUsed`: The date and time the device was last used.
- `isTrusted`: A boolean indicating whether the device is trusted.