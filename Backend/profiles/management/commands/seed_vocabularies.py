from django.core.management.base import BaseCommand
from django.utils.text import slugify
from profiles.models import Vibe, Hobby, Language, LocationOption

VIBES = [
    "Faith-Focused", "Caring", "Cheerful", "Communicative", "Ambitious",
    "Supportive", "Family-Oriented", "Adventurous", "Creative", "Loves Learning",
    "Easygoing", "Thoughtful", "Patient", "Outgoing", "Confident",
]

HOBBIES = [
    "Reading", "Cooking", "Baking", "Football", "Basketball", "Gaming", "Music",
    "Movies & Series", "Photography", "Travelling", "Fitness & Gym", "Dancing",
    "Singing", "Writing", "Drawing & Painting", "Cycling", "Swimming", "Hiking",
    "Volunteering", "Bible Study", "Church Activities", "Technology",
    "Entrepreneurship", "Learning New Skills", "Podcasts", "Gardening", "Fashion",
    "Road Trips", "Exploring New Places", "Board Games",
]

LANGUAGES = [
    "English", "Pidgin English", "Yoruba", "Igbo", "Hausa", "Efik", "Ibibio",
    "Edo", "Urhobo", "Itsekiri", "Ijaw", "Tiv", "Nupe", "Idoma", "Igala",
    "Kanuri", "Fulfulde", "Ebira", "French", "Arabic", "Spanish", "German", "Other",
]

STATES = [
    "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
    "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT (Abuja)",
    "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
    "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
    "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
]

class Command(BaseCommand):
    help = "Seed controlled vocabularies: Vibes, Hobbies, Languages, LocationOptions"
    def handle(self, *args, **options):
        for name in VIBES:
            Vibe.objects.get_or_create(name=name, defaults={"slug": slugify(name), "is_active": True})
        self.stdout.write(self.style.SUCCESS(f"Seeded {Vibe.objects.count()} Vibes"))
        seen = set()
        for name in HOBBIES:
            if name.lower() in seen:
                continue
            seen.add(name.lower())
            Hobby.objects.get_or_create(name=name, defaults={"slug": slugify(name), "is_active": True})
        # ensure Other exists for hobbies
        Hobby.objects.get_or_create(name="Other", defaults={"slug": "other", "is_active": True})
        self.stdout.write(self.style.SUCCESS(f"Seeded {Hobby.objects.count()} Hobbies"))
        for name in LANGUAGES:
            Language.objects.get_or_create(name=name, defaults={"slug": slugify(name), "is_active": True})
        self.stdout.write(self.style.SUCCESS(f"Seeded {Language.objects.count()} Languages"))
        for state in STATES:
            LocationOption.objects.get_or_create(name=state, defaults={"slug": slugify(state), "category": "state", "is_active": True})
        LocationOption.objects.get_or_create(name="Anywhere in Nigeria", defaults={"slug": "anywhere-in-nigeria", "category": "anywhere_nigeria", "is_active": True})
        LocationOption.objects.get_or_create(name="Outside Nigeria", defaults={"slug": "outside-nigeria", "category": "outside_nigeria", "is_active": True})
        self.stdout.write(self.style.SUCCESS(f"Seeded {LocationOption.objects.count()} LocationOptions"))
