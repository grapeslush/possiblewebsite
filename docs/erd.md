# Entity relationship diagram

```mermaid
erDiagram
  User ||--o{ Listing : "creates"
  User ||--o{ Offer : "makes"
  User ||--o{ Order : "purchases"
  User ||--o{ Review : "writes"
  User ||--o{ Address : "owns"
  Listing ||--o{ ListingImage : "includes"
  Listing ||--o{ Offer : "receives"
  Listing ||--o{ OrderItem : "is contained in"
  Offer ||--|{ Order : "can convert"
  Order ||--o{ OrderItem : "contains"
  Order ||--o{ Shipment : "ships"
  Order ||--o{ Payment : "has"
  Order ||--o{ OrderEvent : "logs"
  Order ||--o{ Review : "receives"
  Review }o--|| User : "targets"
  Payout ||--|| Order : "belongs to"
```

The diagram highlights the primary relationships that power marketplace workflows:

- **Listings** have many images, offers, and order items. Sellers publish listings while buyers interact through offers or direct checkout.
- **Orders** aggregate one or more order items and track payments, shipments, and timeline events. Reviews connect buyers and sellers back to completed orders.
- **Payouts** are derived from fulfilled orders and link to financial reconciliation.
- **Addresses** are stored per user and reused for shipping or billing contexts.
