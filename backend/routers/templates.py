from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
import pandas as pd
import io
import zipfile

router = APIRouter()

@router.get("/api/py/templates")
def download_templates():
    try:
        # 1. ASIN Template
        asin_df = pd.DataFrame({
            "ASIN": ["#Test_ASIN_1"],
            "Attribute ID": ["battery_type|color"],
            "Product Type": ["Electronics"],
            "Brand": ["#Test Brand"],
            "Title": ["#Test Wireless Earbuds"],
        })
        asin_io = io.BytesIO()
        asin_df.to_excel(asin_io, index=False)
        asin_io.seek(0)
        
        # 2. Validation Template
        val_df = pd.DataFrame({
            "AttributeID": ["battery_type", "color"],
            "Product Type": ["Electronics", "Electronics"],
            "Dropdown Values / Tooltip": ["Lithium Ion|Alkaline|NiMH", "tooltip: Please extract the main color."],
        })
        val_io = io.BytesIO()
        val_df.to_excel(val_io, index=False)
        val_io.seek(0)
        
        # Package into a ZIP file
        zip_io = io.BytesIO()
        with zipfile.ZipFile(zip_io, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("Template_ASIN_Input.xlsx", asin_io.getvalue())
            zf.writestr("Template_Validation_Ref.xlsx", val_io.getvalue())
            
        zip_io.seek(0)
        
        headers = {
            'Content-Disposition': 'attachment; filename="BlueOps_Templates.zip"',
            'Access-Control-Expose-Headers': 'Content-Disposition'
        }
        
        return Response(
            content=zip_io.getvalue(),
            media_type="application/zip",
            headers=headers
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate templates: {str(e)}")
