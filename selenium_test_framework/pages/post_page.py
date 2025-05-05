from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoAlertPresentException


class PostPage:
    def __init__(self, driver):
        self.driver = driver
        self.url = "http://localhost:3000/post"

    def open(self):
        self.driver.get(self.url)    
        assert self.driver.current_url == self.url, f"Failed to navigate to {self.url}"

    def fill_form(self, title, date, depth, visibility, activity, description):
        self.driver.find_element(By.NAME, "title").send_keys(title)
        date_input = self.driver.find_element(By.NAME, "date")
        date_input.clear()
        date_input.send_keys("04/30/2025")
        # date_element.clear()
        # date_element.send_keys(date)
        # date_element.click()
        self.driver.find_element(By.NAME, "depth").send_keys(str(depth))
        self.driver.find_element(By.NAME, "visibility").send_keys(str(visibility))
        self.driver.find_element(By.NAME, "description").send_keys(description)

        # Select activity type
        activity_label = self.driver.find_element(By.CSS_SELECTOR, f"label[for='activity-{activity}']")
        activity_label.click()

    def select_dummy_location(self):
        # Simulate a click event on the Mapbox map at specific coordinates
        self.driver.execute_script("""
            const map = window.mapboxMap; // Ensure the map instance is globally accessible
            if (map) {
                map.fire('click', { lngLat: { lng: -122.4194, lat: 37.7749 } });
            }
        """)

    def upload_images(self, image_paths):
        upload_input = self.driver.find_element(By.ID, "upload")
        upload_input.send_keys("\n".join(image_paths))

        # Wait for image previews to load
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, "img"))
        )

    def submit(self):
        self.driver.find_element(By.CSS_SELECTOR, "button.w-full.bg-blue-600").click()

    def get_success_message(self):
        try:
            # Wait for the alert to be present
            WebDriverWait(self.driver, 10).until(EC.alert_is_present())
            alert = self.driver.switch_to.alert
            success_message = alert.text
            alert.accept()  # Close the alert
            return success_message
        except NoAlertPresentException:
            raise AssertionError("No success alert was present.")