from django.db import migrations
from django.utils.text import slugify

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

def seed(apps, schema_editor):
    Vibe = apps.get_model("profiles", "Vibe")
    Hobby = apps.get_model("profiles", "Hobby")
    Language = apps.get_model("profiles", "Language")
    LocationOption = apps.get_model("profiles", "LocationOption")
    for name in VIBES:
        Vibe.objects.get_or_create(name=name, defaults={"slug": slugify(name), "is_active": True})
    seen=set()
    for name in HOBBIES:
        if name.lower() in seen:
            continue
        seen.add(name.lower())
        Hobby.objects.get_or_create(name=name, defaults={"slug": slugify(name), "is_active": True})
    Hobby.objects.get_or_create(name="Other", defaults={"slug": "other", "is_active": True})
    for name in LANGUAGES:
        Language.objects.get_or_create(name=name, defaults={"slug": slugify(name), "is_active": True})
    for state in STATES:
        LocationOption.objects.get_or_create(name=state, defaults={"slug": slugify(state), "category": "state", "is_active": True})
    LocationOption.objects.get_or_create(name="Anywhere in Nigeria", defaults={"slug": "anywhere-in-nigeria", "category": "anywhere_nigeria", "is_active": True})
    LocationOption.objects.get_or_create(name="Outside Nigeria", defaults={"slug": "outside-nigeria", "category": "outside_nigeria", "is_active": True})

def unseed(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ("profiles", "0006_hobby_language_locationoption_vibe"),
    ]
    operations = [
        migrations.RunPython(seed, unseed),
    ]
