from django.db import models


# Эти модели используют уже существующие таблицы MySQL.
# Поэтому Django работает с ними через ORM, но сам таблицы не создает.
class UserAccount(models.Model):
    user_id = models.AutoField(primary_key=True, db_column="user_id")
    login = models.CharField(max_length=50, unique=True)
    password = models.CharField(max_length=255)
    nickname = models.CharField(max_length=15, unique=True)
    role = models.CharField(max_length=10, default="user")

    class Meta:
        db_table = "users"
        managed = False


class Breed(models.Model):
    breed_id = models.AutoField(primary_key=True, db_column="breed_id")
    breed_name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = "breeds"
        managed = False


class Pet(models.Model):
    pets_id = models.AutoField(primary_key=True, db_column="pets_id")
    name = models.CharField(max_length=100)
    birth_date = models.DateField(null=True, blank=True)
    owner = models.ForeignKey(UserAccount, on_delete=models.CASCADE, db_column="owner_id", related_name="pets")
    breed = models.ForeignKey(Breed, on_delete=models.PROTECT, db_column="breed_id", related_name="pets")
    weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    color = models.CharField(max_length=50, null=True, blank=True)
    notes = models.CharField(max_length=250, null=True, blank=True)

    class Meta:
        db_table = "pets"
        managed = False


class Vaccination(models.Model):
    id = models.AutoField(primary_key=True)
    v_type = models.CharField(max_length=150)
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, db_column="pet_id", related_name="vaccinations")
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = "vacs"
        managed = False


class PetHealth(models.Model):
    id = models.AutoField(primary_key=True)
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, db_column="pet_id", related_name="health_entries")
    vacs = models.ForeignKey(Vaccination, on_delete=models.CASCADE, db_column="vacs_id", related_name="health_entries")
    v_date = models.DateField()

    class Meta:
        db_table = "pet_health"
        managed = False
