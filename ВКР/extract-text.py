import re

with open("generate-diploma.js", "r", encoding="utf-8") as f:
    content = f.read()

lines = []

for line in content.split("\n"):
    line = line.strip()
    
    # Match p("..."), bullet("..."), h1("..."), h2("..."), h3("..."), figCaption("...")
    m = re.match(r'(?:p|bullet|h1|h2|h3|figCaption)\("(.+?)"\)', line)
    if m:
        text = m.group(1)
        # The file contains literal \uXXXX sequences - decode them
        try:
            decoded = text.encode('raw_unicode_escape').decode('unicode_escape')
        except:
            decoded = text
        
        prefix = ""
        if line.startswith("bullet"):
            prefix = "- "
        elif line.startswith("h1"):
            prefix = "# "
        elif line.startswith("h2"):
            prefix = "## "
        elif line.startswith("h3"):
            prefix = "### "
        elif line.startswith("figCaption"):
            prefix = "[FIGURE] "
        
        lines.append(f"{prefix}{decoded}")
        continue
    
    # Match pRaw([bold("..."), tr("...")]) pattern
    if "pRaw([" in line:
        texts = re.findall(r'(?:bold|tr)\("(.+?)"\)', line)
        decoded_parts = []
        for t in texts:
            try:
                d = t.encode('raw_unicode_escape').decode('unicode_escape')
            except:
                d = t
            decoded_parts.append(d)
        if decoded_parts:
            lines.append(" ".join(decoded_parts))
        continue
    
    # Match makeTable header row
    m = re.match(r'makeTable\(\s*\[(.+?)\],', line)
    if m:
        headers = re.findall(r'"(.+?)"', m.group(1))
        decoded = []
        for h in headers:
            try:
                d = h.encode('raw_unicode_escape').decode('unicode_escape')
            except:
                d = h
            decoded.append(d)
        lines.append("[TABLE] " + " | ".join(decoded))
        continue

with open("text-draft.md", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"Extracted {len(lines)} lines to text-draft.md")
