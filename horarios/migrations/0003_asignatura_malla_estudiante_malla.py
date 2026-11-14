# Generated migration: agrega campo malla a asignatura y estudiante

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('horarios', '0002_docente_usuario_estudiante_usuario_perfilusuario'),
    ]

    operations = [
        migrations.AddField(
            model_name='asignatura',
            name='malla',
            field=models.CharField(default='2021', max_length=50),
        ),
        migrations.AddField(
            model_name='estudiante',
            name='malla',
            field=models.CharField(default='2021', max_length=50),
        ),
    ]
