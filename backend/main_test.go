package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
)

var testDB *sql.DB

// Set up once for all tests
func TestMain(m *testing.M) {
	var err error
	testDB, err = sql.Open("postgres", os.Getenv("TEST_DATABASE_URL"))
	if err != nil {
		panic(err)
	}

	// Reset database state before running tests
	initializeDatabase(testDB)

	code := m.Run()

	testDB.Close()
	os.Exit(code)
}

// Helper to get the router with actual auth
func getTestRouter(db *sql.DB) http.Handler {
	router := mux.NewRouter()

	// Public endpoints
	router.HandleFunc("/sign-up", handleSignUp(db)).Methods("POST")
	router.HandleFunc("/login", handleLogin(db)).Methods("POST")
	router.HandleFunc("/verify-token", handleVerifyToken()).Methods("POST")

	// Private endpoints
	api := router.PathPrefix("/api/go").Subrouter()

	api.Use(authMiddleware)

	api.HandleFunc("/users", getUsers(db)).Methods("GET")
	api.HandleFunc("/users/{id:[0-9]+}", updateUser(db)).Methods("PUT")
	api.HandleFunc("/users/{id:[0-9]+}", deleteUser(db)).Methods("DELETE")

	return enableCORS(jsonContentTypeMiddleware(router))
}

// ========== TESTS ==========

func TestSignUpLoginUpdateAndDelete(t *testing.T) {
	// Step 1: Sign up a new user
	signUpPayload := User{
		FirstName: "Test",
		LastName:  "User",
		Email:     "testsignup@example.com",
		Password:  "testpass123",
		Age:       25,
		Latitude:  40.7128,
		Longitude: -74.0060,
	}

	signUpBody, _ := json.Marshal(signUpPayload)
	signUpReq, _ := http.NewRequest("POST", "/sign-up", bytes.NewBuffer(signUpBody))
	signUpReq.Header.Set("Content-Type", "application/json")

	signUpRR := httptest.NewRecorder()
	router := getTestRouter(testDB)
	router.ServeHTTP(signUpRR, signUpReq)

	if signUpRR.Code != http.StatusOK {
		t.Errorf("Expected 200 OK for sign-up, got %d", signUpRR.Code)
	}

	// Step 2: Log in with the newly created user
	loginPayload := map[string]string{
		"email":    signUpPayload.Email,
		"password": signUpPayload.Password,
	}

	loginBody, _ := json.Marshal(loginPayload)
	loginReq, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(loginBody))
	loginReq.Header.Set("Content-Type", "application/json")

	loginRR := httptest.NewRecorder()
	router.ServeHTTP(loginRR, loginReq)

	if loginRR.Code != http.StatusOK {
		t.Errorf("Expected 200 OK for login, got %d", loginRR.Code)
	}

	// Extract the token from the login response
	var loginResponse map[string]string
	if err := json.NewDecoder(loginRR.Body).Decode(&loginResponse); err != nil {
		t.Fatalf("Error decoding login response: %v", err)
	}

	token, exists := loginResponse["token"]
	if !exists || token == "" {
		t.Error("Expected JWT token in response, but got none")
	}

	// Save the token for use in subsequent requests
	os.Setenv("JWT_TOKEN", token)

	// Step 3: Update the user details
	updatePayload := User{
		FirstName: "Updated",
		LastName:  "User",
		Email:     signUpPayload.Email, // Same email
		Password:  signUpPayload.Password,
		Age:       30,
		Latitude:  41.8781, // New latitude
		Longitude: -87.6298, // New longitude
	}

	updateBody, _ := json.Marshal(updatePayload)
	updateReq, _ := http.NewRequest("PUT", "/api/go/users/1", bytes.NewBuffer(updateBody))
	updateReq.Header.Set("Content-Type", "application/json")
	updateReq.Header.Set("Authorization", "Bearer "+token)

	updateRR := httptest.NewRecorder()
	router.ServeHTTP(updateRR, updateReq)

	if updateRR.Code != http.StatusOK {
		t.Errorf("Expected 200 OK for user update, got %d", updateRR.Code)
	}

	// Step 4: Delete the user
	deleteReq, _ := http.NewRequest("DELETE", "/api/go/users/1", nil)
	deleteReq.Header.Set("Authorization", "Bearer "+token)

	deleteRR := httptest.NewRecorder()
	router.ServeHTTP(deleteRR, deleteReq)

	if deleteRR.Code != http.StatusOK {
		t.Errorf("Expected 200 OK for user deletion, got %d", deleteRR.Code)
	}
}

func TestGetUsersWithAuth(t *testing.T) {
	// Get the JWT token from the environment (from the login test)
	token := os.Getenv("JWT_TOKEN")
	if token == "" {
		t.Fatal("JWT token not set. Did the login test run successfully?")
	}

	req, _ := http.NewRequest("GET", "/api/go/users", nil)
	req.Header.Set("Authorization", "Bearer "+token) // Attach JWT token for auth

	rr := httptest.NewRecorder()
	router := getTestRouter(testDB) // Use the actual router with auth middleware
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200 OK from authenticated route, got %d", rr.Code)
	}
}
