import time
from pages.signup_page import SignUpPage
from selenium.webdriver.common.by import By

def test_page_load_within_3_seconds(browser):
    page = SignUpPage(browser)
    
    start_time = time.time()  # Capture the start time
    page.open()  # Open the page
    end_time = time.time()  # Capture the end time
    
    load_time = end_time - start_time  # Calculate the page load time
    assert load_time <= 3, f"Page load took {load_time:.2f} seconds, which is longer than the expected 3 seconds"

def test_valid_signup(browser):
    page = SignUpPage(browser)
    page.open()
    page.fill_form("Alice", "Wonderland", "alice@example.com", 25, "secure123", "secure123")
    page.select_dummy_location()
    page.submit()
    time.sleep(3)
    assert browser.current_url == "http://localhost:3000/"

def test_invalid_email(browser):
    page = SignUpPage(browser)
    page.open()
    email_input = browser.find_element(By.ID, "email")
    email_input.send_keys("invalid-email")
    form = browser.find_element(By.TAG_NAME, "form")
    form.submit()
    validation_message = browser.execute_script("return arguments[0].validationMessage;", email_input)
    assert "Please include an '@' in the email address" in validation_message

def test_password_mismatch(browser):
    page = SignUpPage(browser)
    page.open()
    page.fill_form("John", "Doe", "john@example.com", 22, "pass123", "wrongpass")
    page.select_dummy_location()
    page.submit()
    assert "Passwords do not match" in page.get_error_message()
