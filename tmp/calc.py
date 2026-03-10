import json

def generate_array(lvl4, lvl10):
    step = (lvl10 - lvl4) / 6
    val1 = lvl4 - 3 * step
    return [round(val1 + i * step, 2) for i in range(10)]

print("Skill 1 heal:", generate_array(7.96, 10.95))
print("Skill 1 heal_efficacy:", generate_array(19.62, 26.98))
print("Skill 2 heal:", generate_array(20.91, 28.11))
print("Burst overheal:", generate_array(20.27, 27.87))
print("Burst defense:", generate_array(15.2, 20.9))
