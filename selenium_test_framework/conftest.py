import pytest
from selenium import webdriver
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from pages.login_page import LoginPage 
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

@pytest.fixture(scope="session")
def browser():
    options = Options()
    options.add_argument("--headless=new")  # or remove `--headless` for visual
    options.add_argument("--window-size=1920,1080")

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    driver.implicitly_wait(10)
    yield driver
    driver.quit()

@pytest.fixture(scope="session")
def auth_token(browser):
    """
    Logs in and retrieves the authentication token from localStorage.
    """
    page = LoginPage(browser)
    page.open()
    page.login("alice@example.com", "secure123")  # Replace with valid credentials
    WebDriverWait(browser, 10).until(EC.url_to_be("http://localhost:3000/"))
    token = browser.execute_script("return localStorage.getItem('token');")
    assert token is not None, "Token should not be None"
    return token