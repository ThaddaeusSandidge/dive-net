from selenium.webdriver.common.by import By

class LoginPage:
    def __init__(self, driver):
        self.driver = driver
        self.url = "http://localhost:3000/login"

    def open(self):
        self.driver.get(self.url)

    def login(self, email, password):
        self.driver.find_element(By.ID, "email").send_keys(email)
        self.driver.find_element(By.ID, "password").send_keys(password)
        self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

    def get_error_message(self):
        return self.driver.find_element(By.CLASS_NAME, "text-red-600").text
