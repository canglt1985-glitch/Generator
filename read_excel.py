import sys
sys.stdout.reconfigure(encoding='utf-8')
import pandas as pd
df = pd.read_excel('D:\\Chuyen doi so\\datasite\\Cap nhat cellname Dong Nai_V6.xlsx', sheet_name='ChiTiet')
with open('D:\\Chuyen doi so\\VT3-VHKT\\read_excel.txt', 'w', encoding='utf-8') as f:
    f.write('---COLUMNS---\n')
    f.write(str(df.columns.tolist()) + '\n')
    f.write('---SAMPLE DATA TỔ 3---\n')
    f.write(str(df['Team'].unique().tolist()) + '\n')
    f.write('---SAMPLE rows---\n')
    f.write(str(df[df['Team'].astype(str).str.contains('3')].head(3).to_dict('records')) + '\n')
