from django.test import TestCase
from django.contrib.auth import get_user_model
from profiles.models import Vibe, Hobby, Language, LocationOption, Photo
from profiles.profile_completion import calculate_profile_completion, is_profile_complete
from django.core.files.uploadedfile import SimpleUploadedFile
from datetime import date
from rest_framework.test import APIClient

User = get_user_model()

class ProfileCompletionTests(TestCase):
    def setUp(self):
        self.vibe = Vibe.objects.create(name="Faith-Focused", slug="faith-focused")
        self.hobby = Hobby.objects.create(name="Reading", slug="reading")
        self.lang = Language.objects.create(name="English", slug="english")
        self.loc = LocationOption.objects.create(name="Lagos", slug="lagos", category="state")
        self.user = User.objects.create_user(email="test@example.com", password="pass12345", first_name="Test", username="test@example.com")
        # Minimal required fields for a complete profile - set all
        self.user.date_of_birth = date(1995, 5, 15)
        self.user.gender = "Female"
        self.user.state_of_residence = "Lagos"
        self.user.marital_status = "Single"
        self.user.nationality = "Nigerian"
        from profiles.models import Denomination
        self.denom = Denomination.objects.create(name="Test Denom", slug="test-denom")
        self.user.denomination = self.denom
        self.user.about_self = "I am a faithful person"
        self.user.seeking_description = "Seeking a serious relationship"
        self.user.preferred_age_min = 25
        self.user.preferred_age_max = 32
        self.user.preferred_height_min = 165
        self.user.preferred_height_max = 180
        self.user.preferred_weight_min = 55
        self.user.preferred_weight_max = 75
        self.user.genotype = "AA"
        self.user.blood_group = "O+"
        self.user.height_cm = 172
        self.user.weight_kg = 68
        self.user.save()
        self.user.vibes.add(self.vibe)
        self.user.hobbies_m2m.add(self.hobby)
        self.user.languages_m2m.add(self.lang)
        self.user.preferred_locations.add(self.loc)
        # create primary photo mock - need a Photo object but can mock has_primary check by creating Photo
        # Use simple file
        from io import BytesIO
        from PIL import Image
        # Create a minimal png
        img = Image.new('RGB', (10,10), color='red')
        buf = BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)
        # Instead of creating real photo file, directly test _has_primary_photo by adding a Photo entry with mocked image
        # Use SimpleUploadedFile
        file = SimpleUploadedFile("test.png", buf.read(), content_type="image/png")
        photo = Photo.objects.create(user=self.user, image=file, is_primary=True)
        self.user.refresh_from_db()

    def test_fully_completed_profile(self):
        result = calculate_profile_completion(self.user)
        self.assertEqual(result["percentage"], 100)
        self.assertTrue(result["is_complete"])
        self.assertEqual(result["missing_fields"], [])

    def test_is_profile_complete_true(self):
        self.assertTrue(is_profile_complete(self.user))

    def test_incomplete_profile_missing_fields(self):
        # Remove denomination
        self.user.denomination = None
        self.user.save()
        result = calculate_profile_completion(self.user)
        self.assertFalse(result["is_complete"])
        self.assertIn("denomination", result["missing_fields"])
        self.assertTrue(result["percentage"] < 100)

    def test_missing_primary_photo(self):
        Photo.objects.filter(user=self.user).delete()
        result = calculate_profile_completion(self.user)
        self.assertIn("primary_photo", result["missing_fields"])

    def test_invalid_age_range(self):
        self.user.preferred_age_min = 35
        self.user.preferred_age_max = 25
        self.user.save()
        result = calculate_profile_completion(self.user)
        self.assertIn("preferred_age", result["missing_fields"])

    def test_invalid_height_range(self):
        self.user.preferred_height_min = 180
        self.user.preferred_height_max = 165
        self.user.save()
        result = calculate_profile_completion(self.user)
        self.assertIn("preferred_height", result["missing_fields"])

    def test_invalid_weight_range(self):
        self.user.preferred_weight_min = 80
        self.user.preferred_weight_max = 60
        self.user.save()
        result = calculate_profile_completion(self.user)
        self.assertIn("preferred_weight", result["missing_fields"])

    def test_max_vibes_validation(self):
        # Try to add 6 vibes via API serializer should fail, but service counts as incomplete if >5? Actually service checks 1-5, >5 counts as invalid? currently _check counts 1-7 as valid, >5 returns False? we check 1 <= count <=5 for vibes, so 6 should be incomplete
        for i in range(6):
            v = Vibe.objects.create(name=f"Vibe{i}", slug=f"vibe{i}")
            self.user.vibes.add(v)
        result = calculate_profile_completion(self.user)
        # should be incomplete due to count >5
        # Our current logic: 1 <= count <=5, so 7 vibes would be >5 -> incomplete
        # But we already have 1+6=7 vibes
        self.assertIn("vibes", result["missing_fields"])

    def test_max_hobbies_validation(self):
        for i in range(8):
            h = Hobby.objects.create(name=f"Hobby{i}", slug=f"hobby{i}")
            self.user.hobbies_m2m.add(h)
        result = calculate_profile_completion(self.user)
        self.assertIn("hobbies", result["missing_fields"])

    def test_multiple_languages(self):
        lang2 = Language.objects.create(name="Yoruba", slug="yoruba")
        self.user.languages_m2m.add(lang2)
        result = calculate_profile_completion(self.user)
        self.assertNotIn("languages", result["missing_fields"])

    def test_multiple_preferred_locations(self):
        loc2 = LocationOption.objects.create(name="Abuja", slug="abuja", category="state")
        loc3 = LocationOption.objects.create(name="Anywhere in Nigeria", slug="anywhere-nigeria", category="anywhere_nigeria")
        self.user.preferred_locations.add(loc2, loc3)
        result = calculate_profile_completion(self.user)
        self.assertNotIn("preferred_locations", result["missing_fields"])

    def test_discover_gating_incomplete(self):
        # Make incomplete
        self.user.nationality = ""
        self.user.save()
        client = APIClient()
        client.force_authenticate(user=self.user)
        resp = client.get("/api/auth/discover/")
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(resp.data["code"], "PROFILE_INCOMPLETE")

    def test_discover_gating_complete(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        resp = client.get("/api/auth/discover/")
        # Even complete, may return 200 with list (possibly empty)
        self.assertEqual(resp.status_code, 200)

    def test_serializer_age_validation(self):
        from accounts.serializers import UserSerializer
        data = {"preferred_age_min": 40, "preferred_age_max": 30}
        # Need instance for context
        s = UserSerializer(instance=self.user, data=data, partial=True)
        self.assertFalse(s.is_valid())
        self.assertIn("preferred_age_min", s.errors)

    def test_existing_user_migration(self):
        # Existing user with minimal fields should be incomplete but not error
        u = User.objects.create_user(email="old@example.com", password="pass12345", username="old@example.com")
        result = calculate_profile_completion(u)
        self.assertFalse(result["is_complete"])
        self.assertGreater(len(result["missing_fields"]), 0)
        self.assertTrue(result["percentage"] < 100)
