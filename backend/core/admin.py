from django.contrib import admin

from .models import (
	ADRReport,
	Batch,
	ComplianceItem,
	DemandForecast,
	DistributionEvent,
	DosageSchedule,
	Inventory,
	Inspection,
	KnowledgeEdge,
	Medicine,
	Notification,
	Prescription,
	PrescriptionItem,
	QualityTest,
	Recall,
	ResearchADRData,
	ResearchDataset,
	Sale,
	Shipment,
	Warehouse,
)


admin.site.register(Medicine)
admin.site.register(Batch)
admin.site.register(QualityTest)
admin.site.register(DistributionEvent)
admin.site.register(Shipment)
admin.site.register(Sale)
admin.site.register(Recall)
admin.site.register(ComplianceItem)
admin.site.register(DemandForecast)
admin.site.register(Warehouse)
admin.site.register(Inventory)
admin.site.register(Inspection)
admin.site.register(Notification)
admin.site.register(ADRReport)
admin.site.register(DosageSchedule)
admin.site.register(Prescription)
admin.site.register(PrescriptionItem)
admin.site.register(ResearchDataset)
admin.site.register(ResearchADRData)
admin.site.register(KnowledgeEdge)
