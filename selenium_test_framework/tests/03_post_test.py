from pages.post_page import PostPage

def test_create_post(browser, auth_token):
    # Inject the token into localStorage
    browser.execute_script(f"localStorage.setItem('token', '{auth_token}');")
    
    # Navigate to the Post page
    page = PostPage(browser)
    page.open()

    # Fill out the form
    page.fill_form(
        title="Test Dive Post",
        date="2025/05/01",
        depth=20,
        visibility=50,
        activity=0,  # Index of the activity (e.g., 0 for "Spear Fishing")
        description="This is a test description for a dive post."
    )

    # Select a location on the map
    page.select_dummy_location()


    # Submit the form
    page.submit()

    # Verify success message
    success_message = page.get_success_message()
    assert "Post created successfully!" in success_message

