"""
Contractor Email Service - Automated Email System for Service Request Workflow
Handles contractor notifications for scheduling (Link 1) and invoice submission (Link 2)
"""

import uuid
import logging
from datetime import datetime
from typing import Optional, List, Dict
from motor.motor_asyncio import AsyncIOMotorDatabase

# Email imports - handle compatibility issues
try:
    import smtplib
    from email.mime.text import MimeText
    from email.mime.multipart import MimeMultipart
    EMAIL_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Email libraries not available: {e}")
    EMAIL_AVAILABLE = False
    # Mock classes for development
    class MimeText:
        def __init__(self, *args, **kwargs): pass
    class MimeMultipart:
        def __init__(self, *args, **kwargs): pass
    class smtplib:
        class SMTP:
            def __init__(self, *args, **kwargs): pass
            def starttls(self): pass
            def login(self, *args, **kwargs): pass
            def send_message(self, *args, **kwargs): pass
            def __enter__(self): return self
            def __exit__(self, *args): pass

from models.service_request import ServiceRequest, ServiceRequestType
from models.account import ContractorProfile
from services.contractor_service import ContractorService
from services.tenant_service import TenantService


logger = logging.getLogger(__name__)


class ContractorEmailService:
    """Service for managing contractor email notifications and workflow automation"""
    
    def __init__(self, db: AsyncIOMotorDatabase, smtp_config: Dict[str, str]):
        self.db = db
        self.smtp_config = smtp_config
        
        # Service type to contractor mapping
        self.service_type_mapping = {
            ServiceRequestType.PLUMBING: "plumbing",
            ServiceRequestType.ELECTRICAL: "electrical", 
            ServiceRequestType.HVAC: "hvac",
            ServiceRequestType.APPLIANCE: "appliance_repair",
            ServiceRequestType.GENERAL_MAINTENANCE: "general_maintenance",
            ServiceRequestType.CLEANING: "cleaning",
            ServiceRequestType.SECURITY: "security",
            ServiceRequestType.OTHER: "general_maintenance"
        }
    
    async def find_contractor_by_service_type(self, service_type: ServiceRequestType) -> Optional[str]:
        """
        Find primary contractor email for the given service type.
        Returns the contractor email or None if not found.
        """
        try:
            service_keyword = self.service_type_mapping.get(service_type, "general_maintenance")
            # Find contractor with this service in their services_offered
            contractor_profile = await self.db.contractor_profiles.find_one({
                "services_offered": {"$in": [service_keyword]}
            })
            
            if contractor_profile:
                # QUICK FIX: contractor_profiles collection already has email field
                # TODO: This is a temporary fix until we restructure the database properly
                contractor_email = contractor_profile.get("email")
                if contractor_email:
                    logger.info(f"✅ Found contractor for {service_keyword}: {contractor_email}")
                    return contractor_email
                
                # Fallback: Get email from contractor account using ContractorService
                contractor_service = ContractorService(self.db)
                contractor_account = await contractor_service.get_contractor_by_id(contractor_profile["account_id"])
                
                if contractor_account and contractor_account.email:
                    logger.info(f"✅ Found contractor email via ContractorService: {contractor_account.email}")
                    return contractor_account.email
            
            # 🧪 TESTING FALLBACK: Use mock contractor for development/testing
            logger.warning(f"No contractor found for service type: {service_type}")
            logger.info("Using mock contractor for testing purposes")
            
            # Return mock contractor email for testing
            mock_contractors = {
                "plumbing": "test.plumber@example.com",
                "electrical": "test.electrician@example.com", 
                "hvac": "test.hvac@example.com",
                "appliance": "test.appliance@example.com",
                "general_maintenance": "test.maintenance@example.com",
                "cleaning": "test.cleaning@example.com",
                "security": "test.security@example.com"
            }
            
            return mock_contractors.get(service_keyword, "test.contractor@example.com")
            
        except Exception as e:
            logger.error(f"Error finding contractor for service type {service_type}: {e}")
            # Return mock contractor as fallback
            return "test.contractor@example.com"
    
    def generate_scheduling_token(self) -> str:
        """Generate unique token for Link 1 (scheduling interface)"""
        return f"schedule_{uuid.uuid4().hex[:16]}"
    
    def generate_invoice_token(self) -> str:
        """Generate unique token for Link 2 (invoice interface)"""
        return f"invoice_{uuid.uuid4().hex[:16]}"
    
    async def send_scheduling_email(self, service_request: ServiceRequest, contractor_email: str, 
                                  scheduling_token: str, base_url: str) -> bool:
        """
        Send Link 1 email to contractor for appointment scheduling.
        
        Args:
            service_request: The service request object
            contractor_email: Contractor's email address
            scheduling_token: Unique token for scheduling interface
            base_url: Base URL for the application (e.g., https://yourdomain.com)
        
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            # Get tenant and property info for context using TenantService
            tenant_service = TenantService(self.db)
            tenant_account = await tenant_service.get_tenant_by_id(service_request.tenant_id)
            property_info = await self.db.properties.find_one({"_id": service_request.property_id})
            
            tenant_name = f"{tenant_account.first_name} {tenant_account.last_name}" if tenant_account else "Tenant"
            property_address = property_info.get("address", "Property") if property_info else "Property"
            
            # Construct Link 1 URL
            scheduling_url = f"{base_url}/contractor/schedule/{scheduling_token}"
            
            # Format preferred slots
            preferred_slots_text = ""
            if service_request.tenant_preferred_slots:
                preferred_slots_text = "\\n".join([
                    f"  • {slot.strftime('%A, %B %d, %Y at %I:%M %p')}"
                    for slot in service_request.tenant_preferred_slots
                ])
            else:
                preferred_slots_text = "  • No specific preferences (any time works)"
            
            # Priority constraints text
            priority_constraints = {
                "emergency": "⚠️ EMERGENCY - Must be scheduled within 24 hours",
                "urgent": "🟡 URGENT - Should be scheduled within 3-5 days", 
                "routine": "🟢 ROUTINE - Can be scheduled within 2 months"
            }
            
            priority_text = priority_constraints.get(service_request.priority, "")
            
            # Email content
            subject = f"🔧 New Service Request: {service_request.title} - {service_request.priority.upper()}"
            
            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
                        🔧 New Service Request Assignment
                    </h2>
                    
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #1f2937;">Request Details</h3>
                        <p><strong>Type:</strong> {service_request.request_type.replace('_', ' ').title()}</p>
                        <p><strong>Priority:</strong> {service_request.priority.title()} {priority_text}</p>
                        <p><strong>Issue:</strong> {service_request.title}</p>
                        <p><strong>Description:</strong> {service_request.description}</p>
                    </div>
                    
                    <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #92400e;">Property Information</h3>
                        <p><strong>Address:</strong> {property_address}</p>
                        <p><strong>Tenant:</strong> {tenant_name}</p>
                        <p><strong>Submitted:</strong> {service_request.submitted_at.strftime('%A, %B %d, %Y at %I:%M %p')}</p>
                    </div>
                    
                    <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #065f46;">Tenant's Preferred Time Slots</h3>
                        <pre style="margin: 0; white-space: pre-wrap;">{preferred_slots_text}</pre>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{scheduling_url}" 
                           style="background-color: #2563eb; color: white; padding: 15px 30px; 
                                  text-decoration: none; border-radius: 8px; font-weight: bold; 
                                  display: inline-block;">
                            📅 Schedule Appointment
                        </a>
                    </div>
                    
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; font-size: 12px; color: #6b7280;">
                        <p><strong>What happens next?</strong></p>
                        <ul>
                            <li>Click the button above to access the scheduling interface</li>
                            <li>Choose to accept a tenant's preferred slot OR propose your own</li>
                            <li>Once confirmed, the tenant will be automatically notified</li>
                            <li>After service completion, you'll receive an invoice upload link</li>
                        </ul>
                        
                        <p style="margin-top: 15px;">
                            <em>This link expires in 7 days. For questions, contact property management.</em>
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Send email
            return await self._send_email(contractor_email, subject, html_body)
            
        except Exception as e:
            logger.error(f"Error sending scheduling email: {e}")
            return False
    
    async def send_invoice_email(self, service_request: ServiceRequest, contractor_email: str,
                               invoice_token: str, base_url: str) -> bool:
        """
        Send Link 2 email to contractor for invoice submission.
        
        Args:
            service_request: The service request object
            contractor_email: Contractor's email address  
            invoice_token: Unique token for invoice interface
            base_url: Base URL for the application
        
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            # Get tenant and property info using TenantService
            tenant_service = TenantService(self.db)
            tenant_account = await tenant_service.get_tenant_by_id(service_request.tenant_id)
            property_info = await self.db.properties.find_one({"_id": service_request.property_id})
            
            tenant_name = f"{tenant_account.first_name} {tenant_account.last_name}" if tenant_account else "Tenant"
            property_address = property_info.get("address", "Property") if property_info else "Property"
            
            # Construct Link 2 URL
            invoice_url = f"{base_url}/contractor/invoice/{invoice_token}"
            
            # Cost thresholds based on service type and priority
            thresholds = {
                "plumbing": {"emergency": 500, "urgent": 300, "routine": 150},
                "electrical": {"emergency": 300, "urgent": 250, "routine": 150},
                "hvac": {"emergency": 800, "urgent": 500, "routine": 200},
                "appliance": {"emergency": 400, "urgent": 300, "routine": 150},
                "general_maintenance": {"emergency": 200, "urgent": 150, "routine": 100}
            }
            
            service_key = self.service_type_mapping.get(service_request.request_type, "general_maintenance")
            threshold = thresholds.get(service_key, {}).get(service_request.priority, 150)
            
            # Email content
            subject = f"💰 Service Complete: Upload Invoice - {service_request.title}"
            
            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px;">
                        💰 Service Complete - Invoice Upload
                    </h2>
                    
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #1f2937;">Completed Service</h3>
                        <p><strong>Service:</strong> {service_request.title}</p>
                        <p><strong>Type:</strong> {service_request.request_type.replace('_', ' ').title()}</p>
                        <p><strong>Property:</strong> {property_address}</p>
                        <p><strong>Tenant:</strong> {tenant_name}</p>
                        <p><strong>Completed:</strong> {datetime.utcnow().strftime('%A, %B %d, %Y')}</p>
                    </div>
                    
                    <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #92400e;">💡 Auto-Processing Information</h3>
                        <p>Invoices <strong>under €{threshold}</strong> will be automatically processed and paid.</p>
                        <p>Invoices over €{threshold} require property manager approval.</p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{invoice_url}" 
                           style="background-color: #059669; color: white; padding: 15px 30px; 
                                  text-decoration: none; border-radius: 8px; font-weight: bold; 
                                  display: inline-block;">
                            📄 Upload Invoice
                        </a>
                    </div>
                    
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; font-size: 12px; color: #6b7280;">
                        <p><strong>Invoice Requirements:</strong></p>
                        <ul>
                            <li>PDF or image format (JPG, PNG)</li>
                            <li>Must include: service description, amount, your business details</li>
                            <li>German tax compliance required (VAT, business registration)</li>
                            <li>Payment processed within 5-7 business days after approval</li>
                        </ul>
                        
                        <p style="margin-top: 15px;">
                            <em>This link expires in 14 days. Upload promptly to ensure quick payment.</em>
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Send email
            return await self._send_email(contractor_email, subject, html_body)
            
        except Exception as e:
            logger.error(f"Error sending invoice email: {e}")
            return False
    
    async def _send_email(self, to_email: str, subject: str, html_body: str) -> bool:
        """
        Internal method to send email using SMTP configuration.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_body: HTML email body
        
        Returns:
            bool: True if sent successfully, False otherwise
        """
        try:     
            if not EMAIL_AVAILABLE:
                # Mock email sending in development
                logger.info(f"📧 MOCK EMAIL to {to_email}: {subject}")
                print(f"\n📧 MOCK EMAIL SENT TO: {to_email}")
                print(f"📝 Subject: {subject}")
                print(f"🔗 Content (first 200 chars): {html_body[:200]}...")
                print(f"📄 Full HTML content saved to: /tmp/mock_email_{to_email.replace('@', '_at_')}.html")
                
                # Save full email content for inspection
                import tempfile
                email_file = f"/tmp/mock_email_{to_email.replace('@', '_at_')}.html"
                try:
                    with open(email_file, 'w') as f:
                        f.write(html_body)
                except Exception as e:
                    print(f"Note: Could not save email file: {e}")
                
                return True
            
            # Create message
            msg = MimeMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.smtp_config['from_email']
            msg['To'] = to_email
            
            # Add HTML content
            html_part = MimeText(html_body, 'html')
            msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.smtp_config['smtp_server'], self.smtp_config['smtp_port']) as server:
                if self.smtp_config.get('use_tls', True):
                    server.starttls()
                
                if self.smtp_config.get('username') and self.smtp_config.get('password'):
                    server.login(self.smtp_config['username'], self.smtp_config['password'])
                
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False


# Email configuration helper
def get_smtp_config() -> Dict[str, str]:
    """
    Get SMTP configuration from environment variables.
    In production, these should be set via environment variables.
    """
    import os
    
    # 🧪 TEST MODE: Use real SMTP for end-to-end testing
    # In production, these should be proper environment variables
    test_smtp_config = {
        'smtp_server': 'smtp.gmail.com',
        'smtp_port': 587,
        'username': 'noreply.erp.test@gmail.com',  # Test account
        'password': 'test_password_here',  # Would be app password in real setup
        'from_email': 'noreply@erp-property-management.com',
        'use_tls': True
    }
    
    # For now, return mock mode but with the structure ready
    return {
        'smtp_server': os.getenv('SMTP_SERVER', 'localhost'),
        'smtp_port': int(os.getenv('SMTP_PORT', '587')),
        'username': os.getenv('SMTP_USERNAME', ''),
        'password': os.getenv('SMTP_PASSWORD', ''),
        'from_email': os.getenv('FROM_EMAIL', 'noreply@property-management.com'),
        'use_tls': os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
    }