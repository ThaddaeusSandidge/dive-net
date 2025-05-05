from selenium.webdriver.common.by import By

class SignUpPage:
    def __init__(self, driver):
        self.driver = driver
        self.url = "http://localhost:3000/sign-up"

    def open(self):
        self.driver.get(self.url)

    def fill_form(self, first_name, last_name, email, age, password, confirm_password):
        self.driver.find_element(By.ID, "firstName").send_keys(first_name)
        self.driver.find_element(By.ID, "lastName").send_keys(last_name)
        self.driver.find_element(By.ID, "email").send_keys(email)
        self.driver.find_element(By.ID, "password").send_keys(password)
        self.driver.find_element(By.ID, "passwordMatch").send_keys(confirm_password)
        self.driver.find_element(By.ID, "age").clear()
        self.driver.find_element(By.ID, "age").send_keys(str(age))

    def select_dummy_location(self):
        # Simulate a click event on the Mapbox map at specific coordinates
        self.driver.execute_script("""
            const map = window.mapboxMap; // Ensure the map instance is globally accessible
            if (map) {
                map.fire('click', { lngLat: { lng: -122.4194, lat: 37.7749 } });
            }
        """)

    def submit(self):
        self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

    def get_error_message(self):
        return self.driver.find_element(By.CLASS_NAME, "text-red-600").text
