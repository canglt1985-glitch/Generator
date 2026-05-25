import pandas as pd

file_path = "data/Cap_nhat_cellname_Dong_Nai_V6.xlsx"
df = pd.read_excel(file_path)
unique_wards = df['Phường/Xã mới'].dropna().unique()
print(unique_wards[:30])
