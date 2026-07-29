from django.db import models
from django.conf import settings

# Create your models here.
class MembershipPlan(models.Model):

    name = models.CharField(max_length=100)

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    duration_days = models.PositiveIntegerField()

    description = models.TextField()



class UserSubscription(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    plan = models.ForeignKey(
        MembershipPlan,
        on_delete=models.CASCADE
    )

    start_date = models.DateTimeField()

    end_date = models.DateTimeField()

    active = models.BooleanField(
        default=True
    )

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
    ]
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='active',
    )

    auto_renew = models.BooleanField(
        default=False
    )