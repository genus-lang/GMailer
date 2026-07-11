import json
import re
import csv
import sys

transcript_path = r'C:\Users\rinku\.gemini\antigravity-ide\brain\3c686f58-098a-49f2-a37e-49d6ff27a462\.system_generated\logs\transcript_full.jsonl'

extracted_lines = []

try:
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for line in f:
            data = json.loads(line)
            if data.get('type') == 'USER_INPUT' and '==Start of PDF==' in data.get('content', ''):
                content = data['content']
                
                # Extract all OCR pages
                pages = re.findall(r'==Start of OCR for page \d+==\n(.*?)==End of OCR for page \d+==', content, re.DOTALL)
                
                for page in pages:
                    lines = page.strip().split('\n')
                    for l in lines:
                        if l.startswith('# Company Name'):
                            continue # skip header
                        if l.startswith('Name'):
                            continue # skip weird trailing names
                        # Line format: 1 _G10X IT Services vijaya.talluri@g10x.com
                        # Usually: <id> <company_name...> <category (e.g. IT Services, YC Startup, MNC / Product, Staffing Agency)> <email>
                        
                        # Use regex to extract email at the end
                        match = re.search(r'^(\d+)\s+(.+?)\s+(IT Services|YC Startup|MNC / Product|Staffing Agency)\s+(\S+@\S+)$', l)
                        if match:
                            id_, company, category, email = match.groups()
                            extracted_lines.append({
                                'ID': id_,
                                'Company': company.strip(),
                                'Category': category.strip(),
                                'Email': email.strip()
                            })
                        else:
                            # fallback if category is not matched perfectly
                            parts = l.split()
                            if len(parts) >= 4 and '@' in parts[-1]:
                                id_ = parts[0]
                                email = parts[-1]
                                # heuristic: try to find category keywords
                                cat = ""
                                comp = ""
                                txt = " ".join(parts[1:-1])
                                if "IT Services" in txt:
                                    cat = "IT Services"
                                    comp = txt.replace("IT Services", "")
                                elif "YC Startup" in txt:
                                    cat = "YC Startup"
                                    comp = txt.replace("YC Startup", "")
                                elif "MNC / Product" in txt:
                                    cat = "MNC / Product"
                                    comp = txt.replace("MNC / Product", "")
                                elif "Staffing Agency" in txt:
                                    cat = "Staffing Agency"
                                    comp = txt.replace("Staffing Agency", "")
                                else:
                                    comp = txt
                                
                                extracted_lines.append({
                                    'ID': id_,
                                    'Company': comp.strip(),
                                    'Category': cat.strip(),
                                    'Email': email.strip()
                                })
                # break # don't break, maybe it's in the last message
except Exception as e:
    print(f"Error parsing transcript: {e}")
    sys.exit(1)

if not extracted_lines:
    print("No data extracted!")
    sys.exit(1)

out_csv = r'd:\dev\exe\Gmailer\public\recruiters_database.csv'
with open(out_csv, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['Company Name', 'Category', 'HR Email ID'])
    for row in extracted_lines:
        writer.writerow([row['Company'], row['Category'], row['Email']])

print(f"Successfully extracted {len(extracted_lines)} records to {out_csv}")
