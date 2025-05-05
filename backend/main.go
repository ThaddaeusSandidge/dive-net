package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/joho/godotenv"
	storage_go "github.com/supabase-community/storage-go"
	"github.com/supabase-community/supabase-go"

	"github.com/gorilla/mux"
	"github.com/lib/pq"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

// Global Supabase client
var supabaseClient *supabase.Client

type User struct {
	Id        int    `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
    Latitude  float64 `json:"latitude"`
    Longitude float64 `json:"longitude"`
	Age       int    `json:"age"`
	Password  string `json:"password"`
	Bio       string `json:"bio,omitempty"`
	Avatar    string `json:"avatar,omitempty"` // URL to profile picture
}

type Post struct {
	Id          int       `json:"id"`
	UserId      int       `json:"user_id"`
	Title       string    `json:"title"`
	Date        string `json:"date"`
	Latitude  float64 `json:"latitude"`
    Longitude float64 `json:"longitude"`
	Depth       float64   `json:"depth"`     // in meters
	Visibility  float64   `json:"visibility"` // in meters
	Activity    string    `json:"activity"`  // e.g., "Spearfishing", "Lobstering"
	Description string    `json:"description"`
	Images      []string  `json:"images"`    // URLs to images
	Timestamp   time.Time `json:"timestamp"`
	Rating      float64   `json:"rating,omitempty"` // User-rated experience of the dive
	Comments    []Comment `json:"comments,omitempty"`
	Likes       int       `json:"likes"`
}

type Comment struct {
	Id        int       `json:"id"`
	PostId    int       `json:"post_id"`
	UserId    int       `json:"user_id"`
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp"`
}

type Like struct {
	Id     int `json:"id"`
	PostId int `json:"post_id"`
	UserId int `json:"user_id"`
}

type CombinedPost struct {
	Id          int       `json:"id"`
	UserId      int       `json:"user_id"`
	UserName    string    `json:"user_name"`
	UserAvatar  string    `json:"user_avatar,omitempty"`
	Title       string    `json:"title"`
	Date        time.Time `json:"date"`
	Latitude    float64   `json:"latitude"`
	Longitude   float64   `json:"longitude"`
	Depth       float64   `json:"depth"`
	Visibility  float64   `json:"visibility"`
	Activity    string    `json:"activity"`
	Description string    `json:"description"`
	Images      []string  `json:"images"`
	Timestamp   time.Time `json:"timestamp"`
	Rating      float64   `json:"rating,omitempty"`
	Likes       int       `json:"likes"`
	Comments    []CombinedComment `json:"comments"`
}

type CombinedComment struct {
	Id        int       `json:"id"`
	PostId    int       `json:"post_id"`
	UserId    int       `json:"user_id"`
	UserName  string    `json:"user_name"`
	UserAvatar string   `json:"user_avatar"`
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp"`
}

func main() {

	// Load environment variables first
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	// Retrieve environment variables
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Default to 8080 if no PORT variable is set
	}

	// Supabase client initialization
	supabaseUrl := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	if supabaseUrl == "" || supabaseKey == "" {
		log.Fatal("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment")
	}

	var err error
	supabaseClient, err = supabase.NewClient(supabaseUrl, supabaseKey, nil)
	if err != nil {
		log.Fatal("Failed to initialize Supabase:", err)
	}
	fmt.Println("Supabase client initialized")

	// Connect to the database
	db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal("Failed to connect to the database:", err)
	}
	defer db.Close()
	fmt.Println("Connecting to DB:", os.Getenv("DATABASE_URL"))

	// Ensure tables are created
	initializeDatabase(db)

	// Create the main router
	router := mux.NewRouter()

	// Public routes
	router.HandleFunc("/login", handleLogin(db)).Methods("POST")
	router.HandleFunc("/sign-up", handleSignUp(db)).Methods("POST")
	router.HandleFunc("/verify-token", handleVerifyToken()).Methods("POST")
	router.HandleFunc("/users/{id}", updateUserAvatar(db)).Methods("PUT")

	// Private routes (require authentication)
	privateRouter := router.PathPrefix("/api/go").Subrouter()
	privateRouter.Use(authMiddleware)

	// User routes
	privateRouter.HandleFunc("/users/search", searchUsers(db)).Methods("GET")
	privateRouter.HandleFunc("/users", getUsers(db)).Methods("GET")
	privateRouter.HandleFunc("/users", createUser(db)).Methods("POST")
	privateRouter.HandleFunc("/users/{id}", getUser(db)).Methods("GET")
	privateRouter.HandleFunc("/users/{id}", updateUser(db)).Methods("PUT")
	privateRouter.HandleFunc("/users/{id}", deleteUser(db)).Methods("DELETE")

	// Post routes
	privateRouter.HandleFunc("/posts/search", getPosts(db)).Methods("POST") // Fetch posts with filters (JSON body)
	privateRouter.HandleFunc("/posts", createPost(db)).Methods("POST")
	privateRouter.HandleFunc("/posts/{id}", getPost(db)).Methods("GET")
	privateRouter.HandleFunc("/posts/{id}", updatePost(db)).Methods("PUT")
	privateRouter.HandleFunc("/posts/{id}", deletePost(db)).Methods("DELETE")

	// Comment routes
	privateRouter.HandleFunc("/posts/{post_id}/comments", getCommentsHandler(db)).Methods("GET")
	privateRouter.HandleFunc("/posts/{post_id}/comments", createComment(db)).Methods("POST")
	privateRouter.HandleFunc("/comments/{id}", updateComment(db)).Methods("PUT")
	privateRouter.HandleFunc("/comments/{id}", deleteComment(db)).Methods("DELETE")

	// Like routes
	privateRouter.HandleFunc("/posts/{post_id}/likes", getLikesByPostID(db)).Methods("GET")
	privateRouter.HandleFunc("/posts/{post_id}/likes", createLike(db)).Methods("POST")
	privateRouter.HandleFunc("/posts/{post_id}/likes", deleteLike(db)).Methods("DELETE")

	// SupaBase Avatar
	privateRouter.HandleFunc("/users/avatar", uploadAvatar(supabaseClient, db)).Methods("POST")
	//SupaBase Feed Posts
	privateRouter.HandleFunc("/posts/images/upload", uploadPostImage(supabaseClient, db)).Methods("POST")


	// Wrap the main router with middlewares
	corsRouter := enableCORS(jsonContentTypeMiddleware(router))

	// Start the server
	log.Printf("Server running on port %s...", port)
	log.Fatal(http.ListenAndServe(":"+port, corsRouter))
}




func initializeDatabase(db *sql.DB) error {
	// drop all tables
	_, err := db.Exec(`
	DROP TABLE IF EXISTS likes;
	DROP TABLE IF EXISTS comments;
	DROP TABLE IF EXISTS posts;
	DROP TABLE IF EXISTS users;
	`)

	if err != nil {
		log.Fatalf("Error dropping tables: %v", err)
	}
	
	// Create the users table
	_, err = db.Exec(`
	CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		first_name TEXT NOT NULL,
		last_name TEXT NOT NULL,
		email TEXT UNIQUE NOT NULL,
		latitude FLOAT,
		longitude FLOAT,
		age INT CHECK (age >= 0),
		password TEXT NOT NULL,
		bio TEXT,
		avatar TEXT
	)`)
	if err != nil {
		log.Fatalf("Error creating users table: %v", err)
	}

	// Create the posts table
	_, err = db.Exec(`
	CREATE TABLE IF NOT EXISTS posts (
		id SERIAL PRIMARY KEY,
		user_id INT REFERENCES users(id) ON DELETE CASCADE,
		title TEXT NOT NULL,
		date TIMESTAMP NOT NULL,
		latitude FLOAT,
		longitude FLOAT,
		depth FLOAT CHECK (depth >= 0),
		visibility FLOAT CHECK (visibility >= 0),
		activity TEXT,
		description TEXT,
		images TEXT[],  -- Array of image URLs
		timestamp TIMESTAMP DEFAULT now(),
		rating FLOAT CHECK (rating >= 0 AND rating <= 5),
		likes INT DEFAULT 0
	)`)
	if err != nil {
		log.Fatalf("Error creating posts table: %v", err)
	}

	// Create the comments table
	_, err = db.Exec(`
	CREATE TABLE IF NOT EXISTS comments (
		id SERIAL PRIMARY KEY,
		post_id INT REFERENCES posts(id) ON DELETE CASCADE,
		user_id INT REFERENCES users(id) ON DELETE CASCADE,
		content TEXT NOT NULL,
		timestamp TIMESTAMP DEFAULT now()
	)`)
	if err != nil {
		log.Fatalf("Error creating comments table: %v", err)
	}

	// Create the likes table
	_, err = db.Exec(`
	CREATE TABLE IF NOT EXISTS likes (
		id SERIAL PRIMARY KEY,
		post_id INT REFERENCES posts(id) ON DELETE CASCADE,
		user_id INT REFERENCES users(id) ON DELETE CASCADE,
		UNIQUE(post_id, user_id) -- Ensures a user can only like a post once
	)`)
	if err != nil {
		log.Fatalf("Error creating likes table: %v", err)
	}

	return nil
}

func authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenString := r.Header.Get("Authorization")
		if tokenString == "" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		tokenString = strings.Replace(tokenString, "Bearer ", "", 1)

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return []byte("secret"), nil
		})

		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		if !token.Valid {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		userID, ok := claims["user_id"].(string)
		if !ok {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), "user_id", userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*") // Allow any origin
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization") // Add Authorization here

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Pass down the request to the next middleware (or final handler)
		next.ServeHTTP(w, r)
	})
}

func jsonContentTypeMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set JSON Content-Type
		w.Header().Set("Content-Type", "application/json")
		next.ServeHTTP(w, r)
	})
}
func getUserByEmail(db *sql.DB, email string) (User, error) {
	var user User
	row := db.QueryRow(`
		SELECT id, first_name, last_name, email, latitude, longitude, age, password, bio, avatar 
		FROM users 
		WHERE email = $1`, email)
	
	err := row.Scan(
		&user.Id, 
		&user.FirstName, 
		&user.LastName, 
		&user.Email, 
		&user.Latitude, 
		&user.Longitude,
		&user.Age, 
		&user.Password, 
		&user.Bio, 
		&user.Avatar,
	)
	
	if err != nil {
		return User{}, err
	}
	return user, nil
}


func createToken(userID int, email string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": strconv.Itoa(userID),
		"email":   email,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	fmt.Println("Token: ", token)
	return token.SignedString([]byte("secret"))
}

func getUserIDFromContext(ctx context.Context) (string, error) {
	userID, ok := ctx.Value("user_id").(string)
	if !ok {
		return "", fmt.Errorf("user ID not found in context")
	}
	return userID, nil
}
func handleVerifyToken() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Extract token from Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			fmt.Println("Authorization header is missing")
			http.Error(w, "Authorization header is required", http.StatusBadRequest)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == "" {
			fmt.Println("Token is required")
			http.Error(w, "Token is required", http.StatusBadRequest)
			return
		}

		// Debug: Log the token received
		fmt.Println("Verifying token: ", tokenString)

		// Parse and validate the token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return []byte("secret"), nil
		})

		if err != nil || !token.Valid {
			fmt.Println("Invalid token: ", err)
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		// Extract claims
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			fmt.Println("Invalid token claims")
			http.Error(w, "Invalid token claims", http.StatusUnauthorized)
			return
		}

		// Debug: Log valid token claims
		fmt.Println("Valid token - claims: ", claims)

		// Respond with claims
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid":  true,
			"claims": claims,
		})
	}
}

func handleSignUp(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var loginReq User
		if err := json.NewDecoder(r.Body).Decode(&loginReq); err != nil {
			fmt.Println("Error decoding login request: ", err)
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}

		fmt.Println("Sign Up attempt for user: ", loginReq.Email)
		fmt.Println("Creating user: ", loginReq.Email)
		createUserPrivate(db, loginReq)

		// Fetch user from DB
		user, err := getUserByEmail(db, loginReq.Email)

		if err != nil {
			if err == sql.ErrNoRows {
				fmt.Println("User not found after creation: ", loginReq.Email)
				http.Error(w, "Invalid email or password", http.StatusUnauthorized)
			} else {
				fmt.Println("Database error: ", err)
				http.Error(w, "Server error", http.StatusInternalServerError)
			}
			return
		}

		// Generate token
		token, err := createToken(user.Id, user.Email)
		if err != nil {
			fmt.Println("Error generating token: ", err)
			http.Error(w, "Server error", http.StatusInternalServerError)
			return
		}

		fmt.Println("Generated token for NEW user: ", user.Email)

		// Respond with token
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"token": token,
			"userId": strconv.Itoa(user.Id),
		})
	}
}

func handleLogin(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var loginReq User
		if err := json.NewDecoder(r.Body).Decode(&loginReq); err != nil {
			fmt.Println("Error decoding login request: ", err)
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}

		fmt.Println("Login attempt for user: ", loginReq.Email)

		// Fetch user from DB
		user, err := getUserByEmail(db, loginReq.Email)
		if err != nil {
			if err == sql.ErrNoRows {
				fmt.Println("User not found: ", loginReq.Email)
				http.Error(w, "Invalid email or password", http.StatusUnauthorized)
			} else {
				fmt.Println("Database error: ", err)
				http.Error(w, "Server error", http.StatusInternalServerError)
			}
			return
		}

		// Compare hashed passwords
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(loginReq.Password)); err != nil {
			fmt.Println("Invalid password for user: ", loginReq.Email)
			http.Error(w, "Invalid email or password", http.StatusUnauthorized)
			return
		}

		// Generate token
		token, err := createToken(user.Id, user.Email)
		if err != nil {
			fmt.Println("Error generating token: ", err)
			http.Error(w, "Server error", http.StatusInternalServerError)
			return
		}

		fmt.Println("Generated token for user: ", user.Email)

		// Respond with token
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"token": token,
		})
	}
}


func searchUsers(db *sql.DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // Add request logging
        log.Printf("Received search request: %s %s", r.Method, r.URL)
        
        query := r.URL.Query().Get("search")
        log.Printf("Search query: %s", query)

        // Verify database connection
        err := db.Ping()
        if err != nil {
            log.Printf("Database connection error: %v", err)
            http.Error(w, "Database connection failed", http.StatusInternalServerError)
            return
        }

        // Build SQL query with proper parameterization
        sqlQuery := `
            SELECT id, first_name, last_name, email, avatar 
            FROM users 
            WHERE LOWER(first_name) LIKE LOWER($1) 
               OR LOWER(last_name) LIKE LOWER($1)
            LIMIT 10`
        
        searchTerm := "%" + query + "%"
        log.Printf("Executing query: %s with param: %s", sqlQuery, searchTerm)

        rows, err := db.Query(sqlQuery, searchTerm)
        if err != nil {
            log.Printf("Query execution error: %v", err)
            http.Error(w, "Database query failed", http.StatusInternalServerError)
            return
        }
        defer rows.Close()

        var users []User
        for rows.Next() {
            var user User
            if err := rows.Scan(&user.Id, &user.FirstName, &user.LastName, &user.Email, &user.Avatar); err != nil {
                log.Printf("Row scan error: %v", err)
                continue
            }
            users = append(users, user)
        }

        if err := rows.Err(); err != nil {
            log.Printf("Rows iteration error: %v", err)
            http.Error(w, "Error processing results", http.StatusInternalServerError)
            return
        }

        log.Printf("Returning %d users", len(users))
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]interface{}{
            "users": users,
        })
    }
}

// Get all users
func getUsers(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rows, err := db.Query(`
			SELECT id, first_name, last_name, email, latitude, longitude, age, bio, avatar FROM users`)
		if err != nil {
			http.Error(w, "Failed to retrieve users", http.StatusInternalServerError)
			log.Println("Database error:", err)
			return
		}
		defer rows.Close()

		users := []User{} // Array of users
		for rows.Next() {
			var u User
			if err := rows.Scan(
				&u.Id, &u.FirstName, &u.LastName, &u.Email, 
				&u.Latitude, &u.Longitude, &u.Age, &u.Bio, &u.Avatar,
			); err != nil {
				http.Error(w, "Error scanning user data", http.StatusInternalServerError)
				log.Println("Scan error:", err)
				return
			}
			users = append(users, u)
		}

		// Check for errors during iteration
		if err := rows.Err(); err != nil {
			http.Error(w, "Error processing user data", http.StatusInternalServerError)
			log.Println("Rows iteration error:", err)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(users)
	}
}

// Get user by ID
func getUser(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]

		var user User
		err := db.QueryRow(`
			SELECT id, first_name, last_name, email, latitude, longitude, age, bio, avatar 
			FROM users 
			WHERE id = $1`, id).Scan(
			&user.Id, &user.FirstName, &user.LastName, 
			&user.Email, &user.Latitude, &user.Longitude, &user.Age, 
			&user.Bio, &user.Avatar,
		)
		if err != nil {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(user)
	}
}

// Create user in the database
func createUserPrivate(db *sql.DB, user User) error {
    // Hash the user's password
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
    if err != nil {
        return err
    }

    // Insert the user into the database
    err = db.QueryRow(`
        INSERT INTO users (first_name, last_name, email, latitude, longitude, age, password, bio, avatar) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        user.FirstName, user.LastName, user.Email, user.Latitude, user.Longitude, user.Age, hashedPassword, user.Bio, user.Avatar,
    ).Scan(&user.Id)

    if err != nil {
        log.Println("Database error:", err)
        return err
    }

    return nil
}
func createExampleUsers(db *sql.DB) error {
    users := []User{
        {
            Id:        1,
            FirstName: "Thad",
            LastName:  "Sandidge",
            Email:     "thad@example.com",
            Latitude:  37.7749,
            Longitude: -122.4194,
            Age:       30,
            Password:  "password123",
            Bio:       "A passionate diver exploring the world's oceans.",
            Avatar:    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=3000&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Random profile image
        },
        {
            Id:        2,
            FirstName: "Maya",
            LastName:  "Kensington",
            Email:     "maya@example.com",
            Latitude:  34.0522,
            Longitude: -118.2437,
            Age:       27,
            Password:  "securepass",
            Bio:       "Marine biologist and adventure seeker.",
            Avatar:    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=3087&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Random profile image
        },
        {
            Id:        3,
            FirstName: "Liam",
            LastName:  "O'Connor",
            Email:     "liam@example.com",
            Latitude:  40.7128,
            Longitude: -74.0060,
            Age:       35,
            Password:  "liamrules",
            Bio:       "Underwater photographer and explorer.",
            Avatar:    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=3164&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Random profile image
        },
    }

    for _, user := range users {
        hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
        if err != nil {
            log.Println("Error hashing password:", err)
            return err
        }

        err = db.QueryRow(
            `INSERT INTO users (id, first_name, last_name, email, latitude, longitude, age, password, bio, avatar) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
            user.Id, user.FirstName, user.LastName, user.Email, user.Latitude, user.Longitude, user.Age, hashedPassword, user.Bio, user.Avatar,
        ).Scan(&user.Id)
        if err != nil {
            log.Println("Error inserting user:", err)
            return err
        }
    }

    log.Println("Example users created successfully!")
    return nil
}

/*
func createExamplePosts(db *sql.DB) error {
    posts := []Post{
        {
            UserId:      1,
            Title:       "Amazing Dive at Blue Hole",
            Date:        time.Now(),
            Latitude:    18.3153,
            Longitude:   -87.5356,
            DiveType:    "Scuba",
            Depth:       40.0,
            Visibility:  30.0,
            Activity:    "Exploration",
            Description: "A breathtaking dive into the depths of the Blue Hole!",
            Images: []string{
                "https://images.unsplash.com/photo-1505765050516-f72dcac9c60e",
                "https://images.unsplash.com/photo-1517991104123-1d57e787ec60",
            },
            Timestamp: time.Now(),
            Rating:    4.8,
            Likes:     1,
        },
        {
            UserId:      2,
            Title:       "Night Dive at the Coral Reefs",
            Date:        time.Now(),
            Latitude:    19.4326,
            Longitude:   -99.1332,
            DiveType:    "Snorkel",
            Depth:       25.0,
            Visibility:  15.0,
            Activity:    "Marine Life Observation",
            Description: "Witnessed bioluminescent creatures lighting up the ocean floor!",
            Images: []string{
                "https://images.unsplash.com/photo-1580137197585-389c31d502b1",
                "https://images.unsplash.com/photo-1533090368676-1fd245e1b263",
            },
            Timestamp: time.Now(),
            Rating:    4.9,
            Likes:     2,
        },
        {
            UserId:      3,
            Title:       "Exploring a Sunken Ship",
            Date:        time.Now(),
            Latitude:    32.7157,
            Longitude:   -117.1611,
            DiveType:    "Scuba",
            Depth:       50.0,
            Visibility:  20.0,
            Activity:    "Historical Exploration",
            Description: "Swam through an old sunken battleship filled with marine life!",
            Images: []string{
                "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
                "https://images.unsplash.com/photo-1519922639192-e73293ca4309",
            },
            Timestamp: time.Now(),
            Rating:    4.7,
            Likes:     3,
        },
    }

    for _, post := range posts {
        err := db.QueryRow(
            `INSERT INTO posts (user_id, title, date, latitude, longitude, dive_type, depth, visibility, activity, description, images, timestamp, rating, likes) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
            post.UserId, post.Title, post.Date, post.Latitude, post.Longitude, post.DiveType, post.Depth, post.Visibility, post.Activity, post.Description, pq.Array(post.Images), post.Timestamp, post.Rating, post.Likes,
        ).Scan(&post.Id)
        if err != nil {
            log.Println("Error inserting post:", err)
            return err
        }

        // Create comments for each post
        comments := []Comment{
            {PostId: post.Id, UserId: post.UserId, Content: "Wow, this looks amazing!", Timestamp: time.Now()},
            {PostId: post.Id, UserId: post.UserId, Content: "Can't wait to visit this spot!", Timestamp: time.Now()},
        }
        for _, comment := range comments {
            err = db.QueryRow(
                `INSERT INTO comments (post_id, user_id, content, timestamp) 
                VALUES ($1, $2, $3, $4) RETURNING id`,
                comment.PostId, comment.UserId, comment.Content, comment.Timestamp,
            ).Scan(&comment.Id)
            if err != nil {
                log.Println("Error inserting comment:", err)
                return err
            }
        }

        // Create a like
        like := Like{PostId: post.Id, UserId: post.UserId}
        err = db.QueryRow(
            `INSERT INTO likes (post_id, user_id) VALUES ($1, $2) RETURNING id`,
            like.PostId, like.UserId,
        ).Scan(&like.Id)
        if err != nil {
            log.Println("Error inserting like:", err)
            return err
        }
    }

    log.Println("Example posts created successfully!")
    return nil
}
*/

// Create user handler
func createUser(db *sql.DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        var user User
        err := json.NewDecoder(r.Body).Decode(&user)
        if err != nil {
            http.Error(w, "Invalid request body", http.StatusBadRequest)
            return
        }

        // Ensure required fields are present
        if user.FirstName == "" || user.LastName == "" || user.Email == "" || user.Password == "" {
            http.Error(w, "Missing required fields", http.StatusBadRequest)
            return
        }

        // Hash password
        hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
        if err != nil {
            http.Error(w, "Failed to hash password", http.StatusInternalServerError)
            return
        }

        // Insert user into database
        err = db.QueryRow(`
            INSERT INTO users (first_name, last_name, email, latitude, longitude, age, password, bio, avatar) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            user.FirstName, user.LastName, user.Email, user.Latitude, user.Longitude, user.Age, hashedPassword, user.Bio, user.Avatar,
        ).Scan(&user.Id)

        if err != nil {
            http.Error(w, "Failed to create user", http.StatusInternalServerError)
            log.Println("Database error:", err)
            return
        }

        // Exclude password in response
        user.Password = ""
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(user)
    }
}

// Update user
func updateUser(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var user User
		err := json.NewDecoder(r.Body).Decode(&user)
		if err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		vars := mux.Vars(r)
		id := vars["id"]

		// Update user data
		_, err = db.Exec(`
			UPDATE users 
			SET first_name = $1, last_name = $2, email = $3, latitude = $4, longitude = $5, age = $6, bio = $7, avatar = $8 
			WHERE id = $9`,
			user.FirstName, user.LastName, user.Email, user.Latitude, user.Longitude, user.Age, user.Bio, user.Avatar, id,
		)
		if err != nil {
			http.Error(w, "Failed to update user", http.StatusInternalServerError)
			log.Println("Database error:", err)
			return
		}

		// Retrieve updated user
		var updatedUser User
		err = db.QueryRow(`
			SELECT id, first_name, last_name, email, latitude, longitude, age, bio, avatar 
			FROM users WHERE id = $1`, id).Scan(
			&updatedUser.Id, &updatedUser.FirstName, &updatedUser.LastName, 
			&updatedUser.Email, &updatedUser.Latitude, &updatedUser.Longitude, &updatedUser.Age, 
			&updatedUser.Bio, &updatedUser.Avatar,
		)
		if err != nil {
			http.Error(w, "User not found after update", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(updatedUser)
	}
}

// Delete user
func deleteUser(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]

		// Check if user exists
		var user User
		err := db.QueryRow(`
			SELECT id, first_name, last_name, email FROM users WHERE id = $1`, id).Scan(
			&user.Id, &user.FirstName, &user.LastName, &user.Email,
		)
		if err != nil {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		// Delete user
		_, err = db.Exec("DELETE FROM users WHERE id = $1", id)
		if err != nil {
			http.Error(w, "Failed to delete user", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "User deleted"})
	}
}


// POST FUNCTIONS

func getPosts(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var filters struct {
			UserID    int     `json:"user_id"`
			Latitude  float64 `json:"latitude"`
			Longitude float64 `json:"longitude"`
			Date      string  `json:"date"`
			Activity  string  `json:"activity"`
		}

		if err := json.NewDecoder(r.Body).Decode(&filters); err != nil {
			http.Error(w, "Invalid JSON body", http.StatusBadRequest)
			log.Println("JSON decode error:", err)
			return
		}

		// Build query dynamically
		conditions := []string{}
		args := []interface{}{}
		argIndex := 1

		if filters.UserID > 0 {
			conditions = append(conditions, fmt.Sprintf("p.user_id = $%d", argIndex))
			args = append(args, filters.UserID)
			argIndex++
		}
		if filters.Latitude != 0 && filters.Longitude != 0 {
			conditions = append(conditions, fmt.Sprintf("p.latitude = $%d AND p.longitude = $%d", argIndex, argIndex+1))
			args = append(args, filters.Latitude, filters.Longitude)
			argIndex += 2
		}
		if filters.Date != "" {
			conditions = append(conditions, fmt.Sprintf("p.date = $%d", argIndex))
			args = append(args, filters.Date)
			argIndex++
		}
		if filters.Activity != "" {
			conditions = append(conditions, fmt.Sprintf("p.activity = $%d", argIndex))
			args = append(args, filters.Activity)
			argIndex++
		}

		// SQL query using JOIN to fetch user name
		query := `
		SELECT p.id, p.user_id, u.first_name || ' ' || u.last_name AS user_name, u.avatar AS user_avatar,
			   p.title, p.date, p.latitude, p.longitude, p.depth, 
			   p.visibility, p.activity, p.description, p.images, p.timestamp, p.rating, 
			   (SELECT COUNT(*) FROM likes WHERE likes.post_id = p.id) AS likes
		FROM posts p
		JOIN users u ON p.user_id = u.id`

		if len(conditions) > 0 {
			query += " WHERE " + strings.Join(conditions, " AND ")
		}

		log.Println("Executing query:", query, "with args:", args)

		rows, err := db.Query(query, args...)
		if err != nil {
			http.Error(w, "Failed to retrieve posts", http.StatusInternalServerError)
			log.Println("Database error:", err)
			return
		}
		defer rows.Close()

		var posts []CombinedPost
		
		for rows.Next() {
			var post CombinedPost
			var images []string // Temporary variable to hold the images array


			if err := rows.Scan(
				&post.Id, &post.UserId, &post.UserName, &post.UserAvatar, &post.Title, &post.Date,
				&post.Latitude, &post.Longitude, &post.Depth,
				&post.Visibility, &post.Activity, &post.Description, pq.Array(&images), &post.Timestamp,
				&post.Rating, &post.Likes,
			); err != nil {
				http.Error(w, "Error scanning post data", http.StatusInternalServerError)
				log.Println("Scan error:", err)
				return
			}

			post.Images = images // Assign the images array to the post


			// Fetch comments
			comments, err := getCommentsByPostID(db, post.Id)
			if err != nil {
				log.Println("Error fetching comments:", err)
			}
			post.Comments = comments

			posts = append(posts, post)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(posts)
	}
}



func getPost(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]

		var post CombinedPost
		var images []string // Temporary variable to hold the images array

		query := `
		SELECT p.id, p.user_id, u.first_name || ' ' || u.last_name AS user_name, u.avatar AS user_avatar,
		   p.title, p.date, p.latitude, p.longitude, p.depth, 
		   p.visibility, p.activity, p.description, p.images, p.timestamp, p.rating, 
		   (SELECT COUNT(*) FROM likes WHERE likes.post_id = p.id) AS likes
		FROM posts p
		JOIN users u ON p.user_id = u.id
		WHERE p.id = $1`

		err := db.QueryRow(query, id).Scan(
			&post.Id, &post.UserId, &post.UserName, &post.UserAvatar, &post.Title, &post.Date,
			&post.Latitude, &post.Longitude, &post.Depth,
			&post.Visibility, &post.Activity, &post.Description, pq.Array(&images), &post.Timestamp,
			&post.Rating, &post.Likes,
		)
		if err != nil {
			http.Error(w, "Post not found", http.StatusNotFound)
			log.Println("Database error:", err)
			return
		}

		post.Images = images // Assign the images array to the post

		// Fetch comments
		comments, err := getCommentsByPostID(db, post.Id)
		if err != nil {
			log.Println("Error fetching comments:", err)
		}
		post.Comments = comments

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(post)
	}
}


func createPost(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var p Post
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			log.Println("Decode error:", err)
			return
		}

		parsedDate, err := time.Parse("2006-01-02", p.Date)
		if err != nil {
			http.Error(w, "Invalid date format. Use YYYY-MM-DD", http.StatusBadRequest)
			log.Println("Date parse error:", err)
			return
		}

		if p.Timestamp.IsZero() {
			p.Timestamp = time.Now()
		}

		err = db.QueryRow(`
			INSERT INTO posts 
			(user_id, title, date, latitude, longitude, depth, visibility, activity, description, images, timestamp, rating, likes) 
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
			RETURNING id`,
			p.UserId, p.Title, parsedDate, p.Latitude, p.Longitude,
			p.Depth, p.Visibility, p.Activity, p.Description, pq.Array(p.Images),
			p.Timestamp, p.Rating, 0,
		).Scan(&p.Id)

		if err != nil {
			log.Println("INSERT error:", err)
			http.Error(w, "Failed to create post", http.StatusInternalServerError)
			return
		}

		log.Println("Successfully created post with ID:", p.Id)

		// Send only the ID back to client as JSON
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(map[string]int{"id": p.Id}); err != nil {
			log.Println("JSON encode error:", err)
			http.Error(w, "Failed to encode response", http.StatusInternalServerError)
			return
		}
	}
}






func updatePost(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var p Post
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		vars := mux.Vars(r)
		id := vars["id"]

		_, err := db.Exec(
			"UPDATE posts SET user_id = $1, title = $2, date = $3, latitude = $4, longitude = $5, depth = $6, visibility = $7, activity = $8, description = $9, timestamp = $10, rating = $11, likes = $12 WHERE id = $13",
			p.UserId, p.Title, p.Date, p.Latitude, p.Longitude, p.Depth, p.Visibility, p.Activity, p.Description, p.Timestamp, p.Rating, p.Likes, id,
		)
		if err != nil {
			http.Error(w, "Failed to update post", http.StatusInternalServerError)
			log.Println("Database error:", err)
			return
		}

		var updatedPost Post
		err = db.QueryRow(
			"SELECT id, user_id, title, date, latitude, longitude, depth, visibility, activity, description, timestamp, rating, likes FROM posts WHERE id = $1", id).Scan(
			&updatedPost.Id, &updatedPost.UserId, &updatedPost.Title, &updatedPost.Date, &updatedPost.Latitude, &updatedPost.Longitude, &updatedPost.Depth,
			&updatedPost.Visibility, &updatedPost.Activity, &updatedPost.Description, &updatedPost.Timestamp, &updatedPost.Rating, &updatedPost.Likes,
		)
		if err != nil {
			http.Error(w, "Post not found after update", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(updatedPost)
	}
}

func deletePost(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]

		_, err := db.Exec("DELETE FROM posts WHERE id = $1", id)
		if err != nil {
			http.Error(w, "Failed to delete post", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

//SupaBase Post Upload
func uploadPostImage(supabaseClient *supabase.Client, db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Println("Received post image upload request")

		userID, err := getUserIDFromContext(r.Context())
		if err != nil {
			log.Println("Error getting user ID:", err)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		err = r.ParseMultipartForm(20 << 20) // 20MB max
		if err != nil {
			log.Println("Error parsing form data:", err)
			http.Error(w, "Failed to parse form data", http.StatusBadRequest)
			return
		}

		postID := r.FormValue("post_id")
		if postID == "" {
			http.Error(w, "Missing post_id", http.StatusBadRequest)
			return
		}

		files := r.MultipartForm.File["images"]
		if len(files) == 0 {
			http.Error(w, "No images provided", http.StatusBadRequest)
			return
		}

		storageClient := supabaseClient.Storage
		var imageURLs []string

		for i, fileHeader := range files {
			file, err := fileHeader.Open()
			if err != nil {
				log.Println("Error opening file:", err)
				http.Error(w, "Failed to read image", http.StatusInternalServerError)
				return
			}
			defer file.Close()

			fileBytes, err := io.ReadAll(file)
			if err != nil {
				log.Println("Error reading image bytes:", err)
				http.Error(w, "Failed to read image", http.StatusInternalServerError)
				return
			}

			ext := filepath.Ext(fileHeader.Filename)
			if ext == "" {
				ext = ".jpeg"
			}

			// NEW STRUCTURE: userID/postID/image1.png
			filePath := fmt.Sprintf("%s/%s/image%d%s", userID, postID, i+1, ext)

			contentType := fileHeader.Header.Get("Content-Type")
			options := storage_go.FileOptions{ContentType: &contentType}
			_, err = storageClient.UploadFile("feedposts", filePath, bytes.NewReader(fileBytes), options)
			if err != nil {
				log.Println("Error uploading image to Supabase:", err)
				http.Error(w, "Failed to upload image", http.StatusInternalServerError)
				return
			}

			url := storageClient.GetPublicUrl("feedposts", filePath).SignedURL
			imageURLs = append(imageURLs, url)
		}

		_, err = db.Exec("UPDATE posts SET images = $1 WHERE id = $2", pq.Array(imageURLs), postID)
		if err != nil {
			log.Println("Error updating post images:", err)
			http.Error(w, "Failed to update post", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"message": "Images uploaded successfully",
			"images":  imageURLs,
		})
	}
}





// LIKE FUNCTIONS

func createLike(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := getUserIDFromContext(r.Context())
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		vars := mux.Vars(r)
		postID := vars["post_id"]

		_, err = db.Exec("INSERT INTO likes (user_id, post_id) VALUES ($1, $2)", userID, postID)
		if err != nil {
			http.Error(w, "Failed to like post", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
	}
}

func getLikesByPostID(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		postID := vars["post_id"]

		rows, err := db.Query("SELECT id, post_id, user_id FROM likes WHERE post_id = $1", postID)
		if err != nil {
			http.Error(w, "Failed to retrieve likes", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		likes := []Like{}
		for rows.Next() {
			var like Like
			if err := rows.Scan(&like.Id, &like.PostId, &like.UserId); err != nil {
				http.Error(w, "Error scanning like data", http.StatusInternalServerError)
				return
			}
			likes = append(likes, like)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(likes)
	}
}

func deleteLike(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := getUserIDFromContext(r.Context())
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		vars := mux.Vars(r)
		postID := vars["post_id"]

		_, err = db.Exec("DELETE FROM likes WHERE user_id = $1 AND post_id = $2", userID, postID)
		if err != nil {
			http.Error(w, "Failed to unlike post", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}



func getCommentsByPostID(db *sql.DB, postID int) ([]CombinedComment, error) {
	query := `
	SELECT c.id, c.post_id, c.user_id, u.first_name || ' ' || u.last_name AS user_name, 
		   u.avatar AS user_avatar, c.content, c.timestamp
	FROM comments c
	JOIN users u ON c.user_id = u.id
	WHERE c.post_id = $1
	ORDER BY c.timestamp ASC;
	`

	rows, err := db.Query(query, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []CombinedComment
	for rows.Next() {
		var comment CombinedComment
		if err := rows.Scan(
			&comment.Id, &comment.PostId, &comment.UserId, &comment.UserName, 
			&comment.UserAvatar, &comment.Content, &comment.Timestamp,
		); err != nil {
			return nil, err
		}
		comments = append(comments, comment)
	}
	return comments, nil
}


// COMMENT ROUTES

func createComment(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := getUserIDFromContext(r.Context())
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var c Comment
		if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		userIDInt, err := strconv.Atoi(userID)
		if err != nil {
			http.Error(w, "Invalid user ID", http.StatusInternalServerError)
			return
		}
		c.UserId = userIDInt

		err = db.QueryRow(`
			INSERT INTO comments (post_id, user_id, content, timestamp)
			VALUES ($1, $2, $3, NOW()) RETURNING id`, c.PostId, c.UserId, c.Content).Scan(&c.Id)
		if err != nil {
			http.Error(w, "Failed to create comment", http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(c)
	}
}

func getCommentsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		postID, err := strconv.Atoi(vars["post_id"])
		if err != nil {
			http.Error(w, "Invalid post ID", http.StatusBadRequest)
			return
		}

		comments, err := getCommentsByPostID(db, postID)
		if err != nil {
			http.Error(w, "Failed to retrieve comments", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(comments)
	}
}

func updateComment(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var c Comment
		if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		vars := mux.Vars(r)
		id := vars["id"]

		_, err := db.Exec(`
			UPDATE comments 
			SET content = $1, timestamp = NOW() 
			WHERE id = $2`, c.Content, id,
		)
		if err != nil {
			http.Error(w, "Failed to update comment", http.StatusInternalServerError)
			log.Println("Database error:", err)
			return
		}

		var updatedComment Comment
		err = db.QueryRow(`
			SELECT id, post_id, user_id, content, timestamp 
			FROM comments WHERE id = $1`, id).Scan(
			&updatedComment.Id, &updatedComment.PostId, &updatedComment.UserId, 
			&updatedComment.Content, &updatedComment.Timestamp,
		)
		if err != nil {
			http.Error(w, "Comment not found after update", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(updatedComment)
	}
}

func deleteComment(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]

		_, err := db.Exec("DELETE FROM comments WHERE id = $1", id)
		if err != nil {
			http.Error(w, "Failed to delete comment", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

func uploadAvatar(supabaseClient *supabase.Client, db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Println("Received avatar upload request")

		userID, err := getUserIDFromContext(r.Context())
		if err != nil {
			log.Println("Error getting user ID:", err)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		userIDInt, err := strconv.Atoi(userID)
		if err != nil {
			log.Println("Error converting user ID to int:", err)
			http.Error(w, "Invalid user ID", http.StatusInternalServerError)
			return
		}

		err = r.ParseMultipartForm(10 << 20) // 10MB
		if err != nil {
			log.Println("Error parsing form data:", err)
			http.Error(w, "Failed to parse form data", http.StatusBadRequest)
			return
		}

		file, handler, err := r.FormFile("avatar")
		if err != nil {
			log.Println("Error retrieving file:", err)
			http.Error(w, "Error retrieving file", http.StatusBadRequest)
			return
		}
		defer file.Close()

		log.Println("Uploaded file:", handler.Filename)

		ext := filepath.Ext(handler.Filename)
		if ext == "" {
			ext = ".png"
		}

		filePath := fmt.Sprintf("%d/profile%s", userIDInt, ext)
		log.Println("Generated file path:", filePath)

		fileBytes, err := io.ReadAll(file)
		if err != nil {
			log.Println("Error reading file bytes:", err)
			http.Error(w, "Failed to read file", http.StatusInternalServerError)
			return
		}

		contentType := handler.Header.Get("Content-Type")
		storageClient := supabaseClient.Storage
		options := storage_go.FileOptions{ContentType: &contentType}

		// Delete old file before uploading
		log.Println("Attempting to delete existing avatar:", filePath)
		_, err = storageClient.RemoveFile("avatars", []string{filePath})
		if err != nil {
			log.Println("Warning: Failed to delete existing avatar (might not exist):", err)
		}

		// Upload new file
		_, err = storageClient.UploadFile("avatars", filePath, bytes.NewReader(fileBytes), options)
		if err != nil {
			log.Println("Error uploading to Supabase:", err)
			http.Error(w, "Failed to upload avatar", http.StatusInternalServerError)
			return
		}
		log.Println("File uploaded successfully")

		// Get public URL
		avatarURL := storageClient.GetPublicUrl("avatars", filePath).SignedURL
		log.Println("Generated avatar URL:", avatarURL)

		var updatedAvatar string
		err = db.QueryRow("UPDATE users SET avatar = $1 WHERE id = $2 RETURNING avatar", avatarURL, userIDInt).Scan(&updatedAvatar)
		if err != nil {
			log.Println("Database update error:", err)
			http.Error(w, "Failed to update user avatar", http.StatusInternalServerError)
			return
		}

		log.Println("User avatar updated successfully:", updatedAvatar)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"avatar": updatedAvatar})
	}
}


func updateUserAvatar(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		userID := vars["id"]

		var input struct {
			Avatar string `json:"avatar"`
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		_, err := db.Exec("UPDATE users SET avatar = $1 WHERE id = $2", input.Avatar, userID)
		if err != nil {
			log.Println("Failed to update avatar:", err)
			http.Error(w, "Failed to update avatar", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "Avatar updated"})
	}
}



