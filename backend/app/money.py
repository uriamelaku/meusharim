from datetime import date
from decimal import Decimal
from typing import Annotated

from pydantic import Field, PlainSerializer

# NUMERIC(12, 2): positive amounts with at most two decimal places.
Amount = Annotated[
    Decimal, Field(gt=0, le=Decimal("9999999999.99"), max_digits=12, decimal_places=2)
]

# Sanity bounds for dates coming from the client, matching the frontend's period picker.
MIN_DATE = date(1900, 1, 1)
MAX_DATE = date(2100, 12, 31)
LedgerDate = Annotated[date, Field(ge=MIN_DATE, le=MAX_DATE)]

# Money in responses: always two decimals ("0.00", "12.50"), whatever the sum's scale.
Money = Annotated[
    Decimal, PlainSerializer(lambda value: str(value.quantize(Decimal("0.01"))), return_type=str)
]
