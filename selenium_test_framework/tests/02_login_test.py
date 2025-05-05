from pages.login_page import LoginPage
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def test_login_invalid_credentials(browser):
    page = LoginPage(browser)
    page.open()
    page.login("wrong@example.com", "wrongpass")
    error_message = page.get_error_message()
    print(f"Actual error message: {error_message}")
    assert "Invalid email or password" in page.get_error_message()

# Only works after a successful signup with the user
def test_login_valid_credentials(browser):
    page = LoginPage(browser)
    page.open()
    page.login("alice@example.com", "secure123")
    WebDriverWait(browser, 10).until(EC.url_to_be("http://localhost:3000/"))
    print(f"Current URL after login: {browser.current_url}")
    assert browser.current_url == "http://localhost:3000/"
    # Retrieve the token from localStorage
    token = browser.execute_script("return localStorage.getItem('token');")
    print(f"Retrieved token: {token}")
    assert token is not None, "Token should not be None"

    # Store the token globally for reuse in other tests
    browser.token = token
